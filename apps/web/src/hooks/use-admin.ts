"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMe } from "./use-me";

/** Admin endpoint data, refetched every refreshMs when given */
export function useAdmin<T>(path: string, refreshMs?: number) {
	const { me } = useMe();
	const isAdmin = !!me?.isAdmin;
	const [data, setData] = useState<T | null>(null);
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (!isAdmin) return;
		let active = true;
		const load = () =>
			api<T>(path)
				.then((d) => active && setData(d))
				.catch(
					(err: Error) =>
						active && toast.error(err.message, { id: path }),
				);
		load();
		const timer = refreshMs ? setInterval(load, refreshMs) : undefined;
		return () => {
			active = false;
			clearInterval(timer);
		};
	}, [isAdmin, path, refreshMs, version]);

	return { data, reload: () => setVersion((v) => v + 1) };
}
