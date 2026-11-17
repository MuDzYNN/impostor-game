import type { Phase, WordEntry } from "@impostor/game";

export const API_URL =
	process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Me {
	id: string;
	name: string;
	avatarUrl: string | null;
	isAdmin: boolean;
}

export type Visibility = "OFFICIAL" | "PRIVATE" | "PUBLIC";

export interface PackSummary {
	id: string;
	name: string;
	language: string;
	visibility: Visibility;
	approved: boolean;
	ownerName: string | null;
	wordCount: number;
	mine: boolean;
}

export interface Pack extends PackSummary {
	words: WordEntry[];
}

export interface PackInput {
	name: string;
	visibility: Visibility;
	words: WordEntry[];
}

export interface Stats {
	games: number;
	wins: number;
	points: number;
	impostorGames: number;
	impostorWins: number;
	recent: {
		playedAt: string;
		word: string;
		category: string;
		wasImpostor: boolean;
		won: boolean;
		points: number;
	}[];
}

export interface AdminStats {
	games: number;
	gamesDay: number;
	gamesWeek: number;
	caughtRate: number | null;
	users: number;
	usersWeek: number;
	activeRooms: number;
	onlinePlayers: number;
	perDay: { day: string; games: number }[];
	categories: { category: string; games: number }[];
}

export interface AdminRoom {
	code: string;
	phase: Phase;
	roundNo: number;
	createdAt: string;
	hostName: string | null;
	members: {
		name: string;
		connected: boolean;
		spectator: boolean;
		loggedIn: boolean;
	}[];
}

export interface AdminGame {
	id: string;
	roomCode: string;
	word: string;
	category: string;
	caught: boolean | null;
	playedAt: string;
	players: number;
}

export interface AdminGameDetail extends Omit<AdminGame, "players"> {
	participants: {
		id: string;
		name: string;
		wasImpostor: boolean;
		won: boolean;
		points: number;
		user: { id: string; name: string } | null;
	}[];
}

export interface AdminUser extends Me {
	createdAt: string;
	providers: string[];
	games: number;
	packs: number;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...init,
		credentials: "include",
		headers: init.body
			? { "Content-Type": "application/json", ...init.headers }
			: init.headers,
	});
	const text = await res.text();
	const data = text ? JSON.parse(text) : null;
	if (!res.ok) {
		const message = Array.isArray(data?.message)
			? data.message.join(", ")
			: data?.message;
		throw new Error(message ?? "Błąd serwera");
	}
	return data as T;
}

export function loginUrl(provider: string, redirectTo = "/") {
	return `${API_URL}/auth/${provider}/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}
