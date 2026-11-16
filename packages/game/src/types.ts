export type Phase = "LOBBY" | "REVEAL" | "PLAYING" | "VOTING" | "RESULT";

export interface Player {
	id: string;
	name: string;
}

export interface WordEntry {
	word: string;
	hint: string;
	category: string;
}

export interface Settings {
	impostorCount: number;
	impostorHint: boolean;
	voting: boolean;
	impostorCanStart: boolean;
	impostorGuess: boolean;
	showCategory: boolean;
	/** Empty means every category */
	categories: string[];
	packIds: string[];
}

export interface Outcome {
	counts: Record<string, number>;
	accusedId: string | null;
	caught: boolean;
}

export interface Guess {
	text: string;
	correct: boolean;
}

export interface Round {
	word: string;
	hint: string;
	category: string;
	impostorIds: string[];
	/** Speaking order, starter first */
	order: string[];
	ready: string[];
	/** null is an abstain */
	votes: Record<string, string | null>;
	outcome: Outcome | null;
	guess: Guess | null;
}

export interface GameState {
	phase: Phase;
	players: Player[];
	settings: Settings;
	round: Round | null;
	roundNo: number;
	scores: Record<string, number>;
	usedWords: string[];
}

export type Card =
	| { role: "crew"; word: string; category: string | null }
	| { role: "impostor"; category: string | null; hint: string | null };

export type Action =
	| { type: "start"; words: WordEntry[] }
	| { type: "ready"; playerId: string }
	| { type: "skip"; playerId: string }
	| { type: "startVoting" }
	| { type: "vote"; playerId: string; targetId: string | null }
	| { type: "reveal" }
	| { type: "guess"; playerId: string; text: string }
	| { type: "skipGuess" }
	| { type: "lobby" }
	| { type: "addPlayer"; player: Player }
	| { type: "removePlayer"; playerId: string }
	| { type: "renamePlayer"; playerId: string; name: string }
	| { type: "settings"; settings: Partial<Settings> };
