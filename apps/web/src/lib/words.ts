import type { WordEntry } from "@impostor/game";

/** One word per line: "hasło; podpowiedź; kategoria" */
export function parseWordLines(
	text: string,
	defaultCategory = "Inne",
): WordEntry[] {
	return text
		.split("\n")
		.map((line) => line.split(";").map((part) => part.trim()))
		.filter(([word]) => word)
		.map(([word, hint = "", category = ""]) => ({
			word,
			hint,
			category: category || defaultCategory,
		}));
}

export function formatWordLines(words: WordEntry[]): string {
	return words.map((w) => [w.word, w.hint, w.category].join("; ")).join("\n");
}
