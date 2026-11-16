import { describe, expect, it } from "vitest";
import {
	BUILTIN_WORDS,
	cardFor,
	createGame,
	GameError,
	maxImpostors,
	normalizeWord,
	reduce,
	wordHidden,
	type GameState,
} from "./index.js";

const players = ["a", "b", "c", "d"].map((id) => ({
	id,
	name: id.toUpperCase(),
}));
const words = [{ word: "Żyrafa", hint: "Szyja", category: "Zwierzęta" }];

function started(settings = {}): GameState {
	return reduce(createGame(players, settings), { type: "start", words });
}

function playing(settings = {}): GameState {
	return players.reduce(
		(s, p) => reduce(s, { type: "ready", playerId: p.id }),
		started(settings),
	);
}

describe("rules", () => {
	it("needs three players", () => {
		expect(() =>
			reduce(createGame(players.slice(0, 2)), { type: "start", words }),
		).toThrow(GameError);
	});

	it("deals one impostor who never sees the word", () => {
		const s = started({ impostorHint: false });
		expect(s.phase).toBe("REVEAL");
		expect(s.round!.impostorIds).toHaveLength(1);
		const impostor = s.round!.impostorIds[0];
		expect(cardFor(s, impostor)).toEqual({
			role: "impostor",
			category: "Zwierzęta",
			hint: null,
		});
		const crew = players.find((p) => p.id !== impostor)!;
		expect(cardFor(s, crew.id)).toMatchObject({
			role: "crew",
			word: "Żyrafa",
		});
	});

	it("hides the category when it is off", () => {
		const s = started({ showCategory: false });
		for (const p of players) expect(cardFor(s, p.id)!.category).toBeNull();
	});

	it("keeps the impostor out of the first turn unless allowed", () => {
		for (let i = 0; i < 50; i++) {
			const s = started();
			expect(s.round!.impostorIds).not.toContain(s.round!.order[0]);
			expect(new Set(s.round!.order).size).toBe(players.length);
		}
	});

	it("moves to PLAYING once everyone has seen the card", () => {
		expect(playing().phase).toBe("PLAYING");
	});

	it("catches the impostor on a clear majority and scores the crew", () => {
		let s = reduce(playing(), { type: "startVoting" });
		const impostor = s.round!.impostorIds[0];
		const crew = players.filter((p) => p.id !== impostor);
		for (const p of crew)
			s = reduce(s, { type: "vote", playerId: p.id, targetId: impostor });
		s = reduce(s, {
			type: "vote",
			playerId: impostor,
			targetId: crew[0].id,
		});
		expect(s.phase).toBe("RESULT");
		expect(s.round!.outcome).toMatchObject({
			accusedId: impostor,
			caught: true,
		});
		expect(s.scores[impostor]).toBe(0);
		expect(s.scores[crew[0].id]).toBe(1);
	});

	it("treats a tie as nobody accused", () => {
		let s = reduce(playing(), { type: "startVoting" });
		const [a, b, c, d] = players.map((p) => p.id);
		s = reduce(s, { type: "vote", playerId: a, targetId: b });
		s = reduce(s, { type: "vote", playerId: b, targetId: a });
		s = reduce(s, { type: "skip", playerId: c });
		s = reduce(s, { type: "skip", playerId: d });
		expect(s.round!.outcome!.accusedId).toBeNull();
		expect(s.scores[s.round!.impostorIds[0]]).toBe(2);
	});

	it("skips voting when it is off", () => {
		const s = reduce(playing({ voting: false }), { type: "startVoting" });
		expect(s.phase).toBe("RESULT");
		expect(s.round!.outcome).toBeNull();
	});

	it("lets the impostor guess once, ignoring case and diacritics", () => {
		const s = reduce(reduce(playing(), { type: "startVoting" }), {
			type: "reveal",
		});
		const impostor = s.round!.impostorIds[0];
		const guessed = reduce(s, {
			type: "guess",
			playerId: impostor,
			text: "  zyrafa ",
		});
		expect(guessed.round!.guess!.correct).toBe(true);
		expect(() =>
			reduce(guessed, { type: "guess", playerId: impostor, text: "x" }),
		).toThrow(GameError);
	});

	it("hides the word until the impostor guesses or passes", () => {
		const s = reduce(reduce(playing(), { type: "startVoting" }), {
			type: "reveal",
		});
		expect(wordHidden(s)).toBe(true);
		expect(wordHidden(reduce(s, { type: "skipGuess" }))).toBe(false);
		expect(
			wordHidden({
				...s,
				settings: { ...s.settings, impostorGuess: false },
			}),
		).toBe(false);
	});

	it("returns to lobby when the impostor leaves mid-round", () => {
		const s = playing();
		const next = reduce(s, {
			type: "removePlayer",
			playerId: s.round!.impostorIds[0],
		});
		expect(next.phase).toBe("LOBBY");
	});

	it("finishes REVEAL when the last unready player leaves", () => {
		let s = started();
		const crew = players.filter(
			(p) => !s.round!.impostorIds.includes(p.id),
		);
		for (const p of players.filter((p) => p.id !== crew[0].id))
			s = reduce(s, { type: "ready", playerId: p.id });
		s = reduce(s, { type: "removePlayer", playerId: crew[0].id });
		expect(s.phase).toBe("PLAYING");
	});

	it("caps impostors at under half the table", () => {
		expect(maxImpostors(3)).toBe(1);
		expect(maxImpostors(5)).toBe(2);
		expect(started({ impostorCount: 3 }).round!.impostorIds).toHaveLength(
			1,
		);
	});

	it("ships a usable word list", () => {
		expect(BUILTIN_WORDS.length).toBeGreaterThan(100);
		expect(normalizeWord("Łódź podwodna")).toBe("lodz podwodna");
	});
});
