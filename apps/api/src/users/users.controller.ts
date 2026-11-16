import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser, SignedIn } from "../auth/session.js";
import type { User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";

@UseGuards(SignedIn)
@Controller("me")
export class UsersController {
	constructor(private readonly prisma: PrismaService) {}

	@Get("stats")
	async stats(@CurrentUser() user: User) {
		const rows = await this.prisma.gameParticipant.findMany({
			where: { userId: user.id },
			include: { game: true },
			orderBy: { game: { playedAt: "desc" } },
		});
		const impostor = rows.filter((r) => r.wasImpostor);
		return {
			games: rows.length,
			wins: rows.filter((r) => r.won).length,
			points: rows.reduce((sum, r) => sum + r.points, 0),
			impostorGames: impostor.length,
			impostorWins: impostor.filter((r) => r.won).length,
			recent: rows.slice(0, 10).map((r) => ({
				playedAt: r.game.playedAt,
				word: r.game.word,
				category: r.game.category,
				wasImpostor: r.wasImpostor,
				won: r.won,
				points: r.points,
			})),
		};
	}
}
