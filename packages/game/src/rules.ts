import type {
	Action,
	Card,
	GameState,
	Outcome,
	Player,
	Round,
	Settings,
	WordEntry,
} from "./types.js";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MAX_NAME_LENGTH = 20;
const USED_WORDS_MEMORY = 50;

export const DEFAULT_SETTINGS: Settings = {
	impostorCount: 1,
	impostorHint: true,
	voting: true,
	impostorCanStart: false,
	impostorGuess: true,
	showCategory: true,
	categories: [],
	packIds: [],
};

export type Rng = () => number;

export class GameError extends Error {
	constructor(
		public readonly code: string,
		message: string,
	) {
		super(message);
	}
}

export function createGame(
	players: Player[] = [],
	settings: Partial<Settings> = {},
): GameState {
	return {
		phase: "LOBBY",
		players,
		settings: { ...DEFAULT_SETTINGS, ...settings },
		round: null,
		roundNo: 0,
		scores: {},
		usedWords: [],
	};
}

export function maxImpostors(playerCount: number): number {
	return Math.max(1, Math.floor((playerCount - 1) / 2));
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export function normalizeWord(text: string): string {
	return text
		.toLowerCase()
		.replace(/ł/g, "l")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function categoriesOf(words: readonly WordEntry[]): string[] {
	return [...new Set(words.map((w) => w.category))].sort((a, b) =>
		a.localeCompare(b, "pl"),
	);
}

export function pickWord(
	words: readonly WordEntry[],
	settings: Settings,
	usedWords: readonly string[],
	rng: Rng = Math.random,
): WordEntry {
	const pool = settings.categories.length
		? words.filter((w) => settings.categories.includes(w.category))
		: words;
	if (!pool.length)
		throw new GameError("NO_WORDS", "Brak słów w wybranych kategoriach");
	const fresh = pool.filter((w) => !usedWords.includes(w.word));
	const from = fresh.length ? fresh : pool;
	return from[Math.floor(rng() * from.length)];
}

export function dealRound(
	players: readonly Player[],
	entry: WordEntry,
	settings: Settings,
	rng: Rng = Math.random,
): Round {
	const ids = players.map((p) => p.id);
	const count = Math.min(settings.impostorCount, maxImpostors(ids.length));
	const impostorIds = shuffle(ids, rng).slice(0, count);
	const candidates = settings.impostorCanStart
		? ids
		: ids.filter((id) => !impostorIds.includes(id));
	const starter = candidates[Math.floor(rng() * candidates.length)];
	const rest = shuffle(
		ids.filter((id) => id !== starter),
		rng,
	);
	return {
		word: entry.word,
		hint: entry.hint,
		category: entry.category,
		impostorIds,
		order: [starter, ...rest],
		ready: [],
		votes: {},
		outcome: null,
		guess: null,
	};
}

/** The word stays secret until the impostor has guessed or passed */
export function wordHidden(state: GameState): boolean {
	return (
		state.phase === "RESULT" &&
		state.settings.impostorGuess &&
		!state.round?.guess
	);
}

export function cardFor(state: GameState, playerId: string): Card | null {
	const round = state.round;
	if (!round || !state.players.some((p) => p.id === playerId)) return null;
	const category = state.settings.showCategory ? round.category : null;
	if (round.impostorIds.includes(playerId)) {
		return {
			role: "impostor",
			category,
			hint: state.settings.impostorHint ? round.hint : null,
		};
	}
	return { role: "crew", word: round.word, category };
}

export function tallyVotes(round: Round): Outcome {
	const counts: Record<string, number> = {};
	for (const target of Object.values(round.votes)) {
		if (target) counts[target] = (counts[target] ?? 0) + 1;
	}
	const top = Math.max(0, ...Object.values(counts));
	const leaders = Object.keys(counts).filter((id) => counts[id] === top);
	const accusedId = top > 0 && leaders.length === 1 ? leaders[0] : null;
	return {
		counts,
		accusedId,
		caught: accusedId !== null && round.impostorIds.includes(accusedId),
	};
}

/** Crew +1 each when the impostor is caught, otherwise impostors +2 each */
export function scoreOutcome(
	state: GameState,
	outcome: Outcome,
): Record<string, number> {
	const round = state.round!;
	const scores = { ...state.scores };
	for (const p of state.players) {
		const impostor = round.impostorIds.includes(p.id);
		const points = outcome.caught ? (impostor ? 0 : 1) : impostor ? 2 : 0;
		scores[p.id] = (scores[p.id] ?? 0) + points;
	}
	return scores;
}

function requirePhase(state: GameState, ...phases: GameState["phase"][]) {
	if (!phases.includes(state.phase))
		throw new GameError("BAD_PHASE", "Ta akcja nie jest teraz dostępna");
}

function requirePlayer(state: GameState, playerId: string) {
	if (!state.players.some((p) => p.id === playerId))
		throw new GameError("NOT_PLAYER", "Nie ma takiego gracza");
}

function toResult(state: GameState): GameState {
	const round = state.round!;
	if (state.phase !== "VOTING") return { ...state, phase: "RESULT" };
	const outcome = tallyVotes(round);
	return {
		...state,
		phase: "RESULT",
		round: { ...round, outcome },
		scores: scoreOutcome(state, outcome),
	};
}

function afterReady(state: GameState): GameState {
	const round = state.round!;
	return round.ready.length >= state.players.length
		? { ...state, phase: "PLAYING" }
		: state;
}

function afterVote(state: GameState): GameState {
	const round = state.round!;
	return Object.keys(round.votes).length >= state.players.length
		? toResult(state)
		: state;
}

export function reduce(
	state: GameState,
	action: Action,
	rng: Rng = Math.random,
): GameState {
	switch (action.type) {
		case "start": {
			requirePhase(state, "LOBBY", "RESULT");
			if (state.players.length < MIN_PLAYERS) {
				throw new GameError(
					"TOO_FEW_PLAYERS",
					`Potrzeba co najmniej ${MIN_PLAYERS} graczy`,
				);
			}
			const entry = pickWord(
				action.words,
				state.settings,
				state.usedWords,
				rng,
			);
			return {
				...state,
				phase: "REVEAL",
				round: dealRound(state.players, entry, state.settings, rng),
				roundNo: state.roundNo + 1,
				usedWords: [entry.word, ...state.usedWords].slice(
					0,
					USED_WORDS_MEMORY,
				),
			};
		}

		case "ready": {
			requirePhase(state, "REVEAL");
			requirePlayer(state, action.playerId);
			const round = state.round!;
			if (round.ready.includes(action.playerId)) return state;
			return afterReady({
				...state,
				round: { ...round, ready: [...round.ready, action.playerId] },
			});
		}

		case "skip": {
			const round = state.round;
			if (state.phase === "REVEAL")
				return reduce(
					state,
					{ type: "ready", playerId: action.playerId },
					rng,
				);
			if (
				state.phase === "VOTING" &&
				round &&
				!(action.playerId in round.votes)
			) {
				return afterVote({
					...state,
					round: {
						...round,
						votes: { ...round.votes, [action.playerId]: null },
					},
				});
			}
			return state;
		}

		case "startVoting": {
			requirePhase(state, "PLAYING");
			return state.settings.voting
				? { ...state, phase: "VOTING" }
				: toResult(state);
		}

		case "vote": {
			requirePhase(state, "VOTING");
			requirePlayer(state, action.playerId);
			if (action.targetId !== null) requirePlayer(state, action.targetId);
			if (action.targetId === action.playerId)
				throw new GameError(
					"SELF_VOTE",
					"Nie możesz głosować na siebie",
				);
			const round = state.round!;
			return afterVote({
				...state,
				round: {
					...round,
					votes: {
						...round.votes,
						[action.playerId]: action.targetId,
					},
				},
			});
		}

		case "reveal": {
			requirePhase(state, "PLAYING", "VOTING");
			return toResult(state);
		}

		case "guess": {
			requirePhase(state, "RESULT");
			const round = state.round!;
			if (!state.settings.impostorGuess)
				throw new GameError("GUESS_OFF", "Zgadywanie jest wyłączone");
			if (!round.impostorIds.includes(action.playerId))
				throw new GameError(
					"NOT_IMPOSTOR",
					"Tylko impostor może zgadywać",
				);
			if (round.guess)
				throw new GameError(
					"ALREADY_GUESSED",
					"Hasło już było zgadywane",
				);
			const correct =
				normalizeWord(action.text) === normalizeWord(round.word);
			const scores = correct
				? {
						...state.scores,
						[action.playerId]:
							(state.scores[action.playerId] ?? 0) + 1,
					}
				: state.scores;
			return {
				...state,
				round: {
					...round,
					guess: { text: action.text.trim(), correct },
				},
				scores,
			};
		}

		case "skipGuess": {
			requirePhase(state, "RESULT");
			const round = state.round!;
			if (round.guess) return state;
			return {
				...state,
				round: { ...round, guess: { text: "", correct: false } },
			};
		}

		case "lobby":
			return { ...state, phase: "LOBBY", round: null };

		case "addPlayer": {
			if (state.players.some((p) => p.id === action.player.id))
				return state;
			if (state.players.length >= MAX_PLAYERS)
				throw new GameError(
					"ROOM_FULL",
					`Maksymalnie ${MAX_PLAYERS} graczy`,
				);
			if (state.phase !== "LOBBY" && state.phase !== "RESULT") {
				throw new GameError(
					"BAD_PHASE",
					"Nie można dodać gracza w trakcie rundy",
				);
			}
			return { ...state, players: [...state.players, action.player] };
		}

		case "removePlayer": {
			const players = state.players.filter(
				(p) => p.id !== action.playerId,
			);
			const { [action.playerId]: _score, ...scores } = state.scores;
			const next = { ...state, players, scores };
			const round = state.round;
			if (!round || state.phase === "LOBBY" || state.phase === "RESULT")
				return next;

			const impostorIds = round.impostorIds.filter(
				(id) => id !== action.playerId,
			);
			// Round makes no sense without an impostor or with too few players
			if (!impostorIds.length || players.length < MIN_PLAYERS)
				return { ...next, phase: "LOBBY", round: null };

			const votes = Object.fromEntries(
				Object.entries(round.votes)
					.filter(([voter]) => voter !== action.playerId)
					.map(([voter, target]) => [
						voter,
						target === action.playerId ? null : target,
					]),
			);
			const trimmed = {
				...next,
				round: {
					...round,
					impostorIds,
					order: round.order.filter((id) => id !== action.playerId),
					ready: round.ready.filter((id) => id !== action.playerId),
					votes,
				},
			};
			if (state.phase === "REVEAL") return afterReady(trimmed);
			if (state.phase === "VOTING") return afterVote(trimmed);
			return trimmed;
		}

		case "renamePlayer":
			return {
				...state,
				players: state.players.map((p) =>
					p.id === action.playerId ? { ...p, name: action.name } : p,
				),
			};

		case "settings": {
			requirePhase(state, "LOBBY", "RESULT");
			const settings = { ...state.settings, ...action.settings };
			settings.impostorCount = Math.max(
				1,
				Math.min(
					Math.floor(settings.impostorCount) || 1,
					maxImpostors(MAX_PLAYERS),
				),
			);
			return { ...state, settings };
		}
	}
}
