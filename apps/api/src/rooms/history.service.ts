import { Injectable, Logger } from "@nestjs/common";
import type { GameState } from "@impostor/game";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class HistoryService {
	private readonly logger = new Logger(HistoryService.name);

	constructor(private readonly prisma: PrismaService) {}

	/** Saves a finished, voted round; userIds maps player id to account id */
	async record(
		code: string,
		state: GameState,
		userIds: Map<string, string | null>,
		before: Record<string, number>,
	) {
		const round = state.round;
		if (!round?.outcome) return;
		try {
			await this.prisma.game.create({
				data: {
					roomCode: code,
					word: round.word,
					category: round.category,
					caught: round.outcome.caught,
					participants: {
						create: state.players.map((p) => {
							const wasImpostor = round.impostorIds.includes(
								p.id,
							);
							return {
								userId: userIds.get(p.id) ?? null,
								name: p.name,
								wasImpostor,
								won: wasImpostor !== round.outcome!.caught,
								points:
									(state.scores[p.id] ?? 0) -
									(before[p.id] ?? 0),
							};
						}),
					},
				},
			});
		} catch (err) {
			this.logger.warn(
				`Nie zapisano historii gry: ${(err as Error).message}`,
			);
		}
	}
}
