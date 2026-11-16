"use client";

import { useEffect, useState } from "react";
import { BUILTIN_WORDS, type WordEntry } from "@impostor/game";
import { api } from "@/lib/api";

/** Words of the chosen packs; built-in list when the server is unreachable */
export function useWords(packIds: string[]) {
	const [words, setWords] = useState<WordEntry[] | null>(null);
	const [offline, setOffline] = useState(false);
	const key = packIds.join(",");

	useEffect(() => {
		let cancelled = false;
		api<WordEntry[]>(`/words?packIds=${encodeURIComponent(key)}`)
			.then((list) => {
				if (cancelled) return;
				setWords(list);
				setOffline(false);
			})
			.catch(() => {
				if (cancelled) return;
				setWords(BUILTIN_WORDS);
				setOffline(true);
			});
		return () => {
			cancelled = true;
		};
	}, [key]);

	return { words, offline };
}
