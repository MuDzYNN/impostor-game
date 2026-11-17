import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { BUILTIN_WORDS, type WordEntry } from "@impostor/game";
import { z } from "zod";
import type { User } from "../generated/prisma/client.js";
import type { WordPackWhereInput } from "../generated/prisma/models.js";
import { PrismaService } from "../prisma.service.js";

export const packSchema = z.object({
	name: z.string().trim().min(1).max(60),
	language: z.string().trim().min(2).max(5).default("pl"),
	visibility: z.enum(["OFFICIAL", "PRIVATE", "PUBLIC"]).default("PRIVATE"),
	words: z
		.array(
			z.object({
				word: z.string().trim().min(1).max(60),
				hint: z.string().trim().max(60).default(""),
				category: z.string().trim().min(1).max(40).default("Inne"),
			}),
		)
		.min(1)
		.max(1000),
});

export type PackInput = z.infer<typeof packSchema>;

const summarySelect = {
	id: true,
	name: true,
	language: true,
	visibility: true,
	approved: true,
	ownerId: true,
	owner: { select: { name: true } },
	_count: { select: { words: true } },
} as const;

@Injectable()
export class PacksService {
	constructor(private readonly prisma: PrismaService) {}

	private summary(
		pack: {
			id: string;
			name: string;
			language: string;
			visibility: string;
			approved: boolean;
			ownerId: string | null;
			owner: { name: string } | null;
			_count: { words: number };
		},
		user: User | null,
	) {
		return {
			id: pack.id,
			name: pack.name,
			language: pack.language,
			visibility: pack.visibility,
			approved: pack.approved,
			ownerName: pack.owner?.name ?? null,
			wordCount: pack._count.words,
			mine: !!user && pack.ownerId === user.id,
		};
	}

	async list(user: User | null) {
		const or: WordPackWhereInput[] = [
			{ visibility: "OFFICIAL" },
			{ visibility: "PUBLIC", approved: true },
		];
		if (user) or.push({ ownerId: user.id });
		const packs = await this.prisma.wordPack.findMany({
			where: { OR: or },
			select: summarySelect,
			orderBy: [{ visibility: "asc" }, { name: "asc" }],
		});
		return packs.map((p) => this.summary(p, user));
	}

	async pending(user: User) {
		const packs = await this.prisma.wordPack.findMany({
			where: { visibility: "PUBLIC", approved: false },
			select: summarySelect,
			orderBy: { updatedAt: "asc" },
		});
		return packs.map((p) => this.summary(p, user));
	}

	/** Any pack is readable by id, so private packs can be shared by link */
	async get(id: string, user: User | null) {
		const pack = await this.prisma.wordPack.findUnique({
			where: { id },
			select: {
				...summarySelect,
				words: {
					select: { word: true, hint: true, category: true },
					orderBy: { category: "asc" },
				},
			},
		});
		if (!pack) throw new NotFoundException("Nie ma takiej paczki");
		return { ...this.summary(pack, user), words: pack.words };
	}

	/** Words for a game; falls back to official packs, then the built-in list */
	async wordsFor(packIds: string[]): Promise<WordEntry[]> {
		try {
			const where: WordPackWhereInput = packIds.length
				? { id: { in: packIds } }
				: { visibility: "OFFICIAL" };
			const words = await this.prisma.word.findMany({
				where: { pack: where },
				select: { word: true, hint: true, category: true },
			});
			return words.length ? words : BUILTIN_WORDS;
		} catch {
			return BUILTIN_WORDS;
		}
	}

	async create(user: User, input: PackInput) {
		if (input.visibility === "OFFICIAL" && !user.isAdmin)
			throw new ForbiddenException(
				"Tylko administrator tworzy oficjalne paczki",
			);
		const pack = await this.prisma.wordPack.create({
			data: {
				name: input.name,
				language: input.language,
				visibility: input.visibility,
				approved: user.isAdmin,
				ownerId: input.visibility === "OFFICIAL" ? null : user.id,
				words: { create: input.words },
			},
		});
		return this.get(pack.id, user);
	}

	private async editable(id: string, user: User) {
		const pack = await this.prisma.wordPack.findUnique({ where: { id } });
		if (!pack) throw new NotFoundException("Nie ma takiej paczki");
		if (pack.ownerId !== user.id && !user.isAdmin)
			throw new ForbiddenException("To nie twoja paczka");
		return pack;
	}

	async update(id: string, user: User, input: PackInput) {
		await this.editable(id, user);
		if (input.visibility === "OFFICIAL" && !user.isAdmin)
			throw new ForbiddenException(
				"Tylko administrator tworzy oficjalne paczki",
			);
		await this.prisma.$transaction([
			this.prisma.word.deleteMany({ where: { packId: id } }),
			this.prisma.wordPack.update({
				where: { id },
				data: {
					name: input.name,
					language: input.language,
					visibility: input.visibility,
					approved: user.isAdmin,
					words: { create: input.words },
				},
			}),
		]);
		return this.get(id, user);
	}

	async remove(id: string, user: User) {
		await this.editable(id, user);
		await this.prisma.wordPack.delete({ where: { id } });
		return { ok: true };
	}

	async moderate(id: string, approve: boolean) {
		const { count } = await this.prisma.wordPack.updateMany({
			where: { id },
			data: approve
				? { approved: true }
				: { approved: false, visibility: "PRIVATE" },
		});
		if (!count) throw new NotFoundException("Nie ma takiej paczki");
		return { ok: true };
	}
}
