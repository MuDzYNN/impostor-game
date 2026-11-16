"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { api, type Me } from "@/lib/api";

interface MeContext {
	me: Me | null;
	loading: boolean;
	refresh: () => Promise<void>;
	logout: () => Promise<void>;
}

const Context = createContext<MeContext | null>(null);

export function MeProvider({ children }: { children: React.ReactNode }) {
	const [me, setMe] = useState<Me | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			setMe(await api<Me | null>("/auth/me"));
		} catch {
			setMe(null);
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		await api("/auth/logout", { method: "POST" });
		setMe(null);
	}, []);

	useEffect(() => {
		api<Me | null>("/auth/me")
			.then(setMe, () => setMe(null))
			.finally(() => setLoading(false));
	}, []);

	return (
		<Context.Provider value={{ me, loading, refresh, logout }}>
			{children}
		</Context.Provider>
	);
}

export function useMe() {
	const ctx = useContext(Context);
	if (!ctx) throw new Error("useMe must be used within MeProvider");
	return ctx;
}
