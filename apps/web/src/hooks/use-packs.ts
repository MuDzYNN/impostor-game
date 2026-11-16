"use client";

import { useEffect, useState } from "react";
import { api, type PackSummary } from "@/lib/api";
import { storage } from "@/lib/storage";
import { useMe } from "./use-me";

/** Listed packs plus private ones opened by link on this device */
export function usePacks() {
	const { me } = useMe();
	const [packs, setPacks] = useState<PackSummary[] | null>(null);
	const [offline, setOffline] = useState(false);

	useEffect(() => {
		let cancelled = false;
		api<PackSummary[]>("/packs")
			.then((list) => {
				if (cancelled) return;
				const seen = storage
					.seenPacks()
					.filter((s) => !list.some((p) => p.id === s.id))
					.map((s): PackSummary => ({
						...s,
						language: "pl",
						visibility: "PRIVATE",
						approved: false,
						ownerName: null,
						wordCount: 0,
						mine: false,
					}));
				setPacks([...list, ...seen]);
				setOffline(false);
			})
			.catch(() => {
				if (cancelled) return;
				setPacks([]);
				setOffline(true);
			});
		return () => {
			cancelled = true;
		};
	}, [me?.id]);

	return { packs, offline };
}
