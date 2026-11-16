import type { Card, Guess, Outcome, Phase, Settings } from "./types.js";

export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface MemberView {
	id: string;
	name: string;
	connected: boolean;
	spectator: boolean;
	score: number;
}

export interface RoundView {
	order: string[];
	readyIds: string[];
	votedIds: string[];
	/** Filled only in RESULT */
	result: {
		/** null until the impostor has guessed or passed */
		word: string | null;
		hint: string | null;
		category: string;
		impostorIds: string[];
		votes: Record<string, string | null>;
		outcome: Outcome | null;
		guess: Guess | null;
	} | null;
}

export interface RoomView {
	code: string;
	hostId: string;
	meId: string;
	phase: Phase;
	settings: Settings;
	roundNo: number;
	members: MemberView[];
	round: RoundView | null;
	card: Card | null;
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface ClientEvents {
	"room:create": (
		data: { name: string; token: string },
		ack: (res: Ack<{ code: string }>) => void,
	) => void;
	"room:join": (
		data: { code: string; name: string; token: string },
		ack: (res: Ack<{ code: string }>) => void,
	) => void;
	"room:leave": (ack: (res: Ack) => void) => void;
	"room:kick": (data: { playerId: string }, ack: (res: Ack) => void) => void;
	"room:rename": (data: { name: string }, ack: (res: Ack) => void) => void;
	"room:settings": (data: Partial<Settings>, ack: (res: Ack) => void) => void;
	"game:start": (ack: (res: Ack) => void) => void;
	"game:ready": (ack: (res: Ack) => void) => void;
	"game:voting": (ack: (res: Ack) => void) => void;
	"game:vote": (
		data: { targetId: string | null },
		ack: (res: Ack) => void,
	) => void;
	"game:reveal": (ack: (res: Ack) => void) => void;
	"game:guess": (data: { text: string }, ack: (res: Ack) => void) => void;
	"game:skipGuess": (ack: (res: Ack) => void) => void;
	"game:lobby": (ack: (res: Ack) => void) => void;
}

export interface ServerEvents {
	"room:state": (view: RoomView) => void;
	"room:kicked": () => void;
}
