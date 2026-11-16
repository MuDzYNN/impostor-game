import {
	DEFAULT_SETTINGS,
	type GameState,
	type Settings,
	type WordEntry,
} from "@impostor/game";

const KEYS = {
	token: "impostor.token",
	nick: "impostor.nick",
	players: "impostor.players",
	settings: "impostor.settings",
	localWords: "impostor.localWords",
	localGame: "impostor.localGame",
	seenPacks: "impostor.seenPacks",
} as const;

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown) {
	if (value === null) localStorage.removeItem(key);
	else localStorage.setItem(key, JSON.stringify(value));
}

export function sessionToken(): string {
	let token = read<string | null>(KEYS.token, null);
	if (!token) {
		token = crypto.randomUUID();
		write(KEYS.token, token);
	}
	return token;
}

export const storage = {
	nick: () => read(KEYS.nick, ""),
	setNick: (nick: string) => write(KEYS.nick, nick),
	players: () => read<string[]>(KEYS.players, []),
	setPlayers: (players: string[]) => write(KEYS.players, players),
	settings: () => ({
		...DEFAULT_SETTINGS,
		...read<Partial<Settings>>(KEYS.settings, {}),
	}),
	setSettings: (settings: Settings) => write(KEYS.settings, settings),
	localWords: () => read<WordEntry[]>(KEYS.localWords, []),
	setLocalWords: (words: WordEntry[]) => write(KEYS.localWords, words),
	localGame: () => read<GameState | null>(KEYS.localGame, null),
	setLocalGame: (game: GameState | null) => write(KEYS.localGame, game),
	seenPacks: () => read<{ id: string; name: string }[]>(KEYS.seenPacks, []),
	rememberPack: (pack: { id: string; name: string }) =>
		write(
			KEYS.seenPacks,
			[
				pack,
				...read<{ id: string; name: string }[]>(
					KEYS.seenPacks,
					[],
				).filter((p) => p.id !== pack.id),
			].slice(0, 20),
		),
};
