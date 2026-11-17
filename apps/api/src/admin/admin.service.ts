import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import type { User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";
import { RoomsService } from "../rooms/rooms.service.js";

export const adminSchema = z.object({ isAdmin: z.boolean() });

export type AdminInput = z.infer<typeof adminSchema>;

const PAGE_SIZE = 25;
const CHART_DAYS = 30;
const DAY_MS = 86_400_000;
const TIME_ZONE = "Europe/Warsaw";

/** YYYY-MM-DD in Polish time */
const dayKey = (date: Date) =>
	date.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });

@Injectable()
export class AdminService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly rooms: RoomsService,
	) {}

	async stats() {
		const now = Date.now();
		const dayAgo = new Date(now - DAY_MS);
		const weekAgo = new Date(now - 7 * DAY_MS);
		const [
			games,
			gamesDay,
			gamesWeek,
			caught,
			judged,
			users,
			usersWeek,
			perDay,
			categories,
		] = await Promise.all([
			this.prisma.game.count(),
			this.prisma.game.count({ where: { playedAt: { gte: dayAgo } } }),
			this.prisma.game.count({ where: { playedAt: { gte: weekAgo } } }),
			this.prisma.game.count({ where: { caught: true } }),
			this.prisma.game.count({ where: { caught: { not: null } } }),
			this.prisma.user.count(),
			this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
			this.prisma.$queryRaw<{ day: string; games: number }[]>`
				SELECT to_char("playedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day,
					count(*)::int AS games
				FROM "Game"
				WHERE "playedAt" >= ${new Date(now - CHART_DAYS * DAY_MS)}
				GROUP BY 1`,
			this.prisma.game.groupBy({
				by: ["category"],
				_count: { _all: true },
				orderBy: { _count: { category: "desc" } },
				take: 8,
			}),
		]);
		const rooms = this.rooms.list();
		const counts = new Map(perDay.map((d) => [d.day, d.games]));
		return {
			games,
			gamesDay,
			gamesWeek,
			caughtRate: judged ? caught / judged : null,
			users,
			usersWeek,
			activeRooms: rooms.length,
			onlinePlayers: rooms.reduce(
				(sum, r) => sum + r.members.filter((m) => m.socketId).length,
				0,
			),
			perDay: Array.from({ length: CHART_DAYS }, (_, i) => {
				const day = dayKey(
					new Date(now - (CHART_DAYS - 1 - i) * DAY_MS),
				);
				return { day, games: counts.get(day) ?? 0 };
			}),
			categories: categories.map((c) => ({
				category: c.category,
				games: c._count._all,
			})),
		};
	}

	liveRooms() {
		return this.rooms
			.list()
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((r) => ({
				code: r.code,
				phase: r.state.phase,
				roundNo: r.state.roundNo,
				createdAt: new Date(r.createdAt),
				hostName:
					r.members.find((m) => m.id === r.hostId)?.name ?? null,
				members: r.members.map((m) => ({
					name: m.name,
					connected: !!m.socketId,
					spectator: m.spectator,
					loggedIn: !!m.userId,
				})),
			}));
	}

	async games(page: number, userId?: string) {
		const where = userId ? { participants: { some: { userId } } } : {};
		const [games, total, user] = await Promise.all([
			this.prisma.game.findMany({
				where,
				orderBy: { playedAt: "desc" },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				include: { _count: { select: { participants: true } } },
			}),
			this.prisma.game.count({ where }),
			userId
				? this.prisma.user.findUnique({
						where: { id: userId },
						select: { id: true, name: true },
					})
				: null,
		]);
		return {
			user,
			games: games.map(({ _count, ...g }) => ({
				...g,
				players: _count.participants,
			})),
			pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		};
	}

	async game(id: string) {
		const game = await this.prisma.game.findUnique({
			where: { id },
			include: {
				participants: {
					orderBy: { points: "desc" },
					include: { user: { select: { id: true, name: true } } },
				},
			},
		});
		if (!game) throw new NotFoundException("Nie ma takiej gry");
		return game;
	}

	async users(page: number, q?: string) {
		const where = q
			? { name: { contains: q, mode: "insensitive" as const } }
			: {};
		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				select: {
					id: true,
					name: true,
					avatarUrl: true,
					isAdmin: true,
					createdAt: true,
					accounts: { select: { provider: true } },
					_count: { select: { participations: true, packs: true } },
				},
			}),
			this.prisma.user.count({ where }),
		]);
		return {
			users: users.map(({ accounts, _count, ...u }) => ({
				...u,
				providers: accounts.map((a) => a.provider),
				games: _count.participations,
				packs: _count.packs,
			})),
			pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		};
	}

	async setAdmin(id: string, admin: User, input: AdminInput) {
		if (id === admin.id)
			throw new BadRequestException("Nie możesz zmienić uprawnień sobie");
		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) throw new NotFoundException("Nie ma takiego użytkownika");
		await this.prisma.user.update({
			where: { id },
			data: { isAdmin: input.isAdmin },
		});
	}
}
