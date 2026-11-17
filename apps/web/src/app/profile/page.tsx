"use client";

import { useEffect, useState } from "react";
import { MAX_NAME_LENGTH } from "@impostor/game";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";
import { api, type Stats } from "@/lib/api";

export default function ProfilePage() {
	const { me, loading, refresh } = useMe();
	const [draft, setDraft] = useState<string | null>(null);
	const [stats, setStats] = useState<Stats | null>(null);

	useEffect(() => {
		if (!me) return;
		api<Stats>("/me/stats")
			.then(setStats)
			.catch(() => setStats(null));
	}, [me]);

	if (loading) return <p className="text-muted-foreground">Ładowanie…</p>;
	if (!me)
		return (
			<p className="text-muted-foreground">
				Zaloguj się, żeby zobaczyć profil.
			</p>
		);
	const name = draft ?? me.name;

	async function rename(e: React.FormEvent) {
		e.preventDefault();
		try {
			await api("/auth/me", {
				method: "PATCH",
				body: JSON.stringify({ name }),
			});
			await refresh();
			toast.success("Zapisano nick");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	const winRate = stats?.games
		? Math.round((stats.wins / stats.games) * 100)
		: 0;

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Nick</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="flex max-w-sm gap-2" onSubmit={rename}>
						<Input
							value={name}
							onChange={(e) => setDraft(e.target.value)}
							maxLength={MAX_NAME_LENGTH}
						/>
						<Button type="submit">Zapisz</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Statystyki online</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{!stats ? (
						<p className="text-muted-foreground">Ładowanie…</p>
					) : (
						<>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								<Stat
									label="rozegrane rundy"
									value={stats.games}
								/>
								<Stat label="wygrane" value={`${winRate}%`} />
								<Stat label="punkty" value={stats.points} />
								<Stat
									label="jako impostor (wygrane)"
									value={`${stats.impostorGames} (${stats.impostorWins})`}
								/>
							</div>
							{stats.recent.length > 0 && (
								<ul className="flex flex-col gap-1">
									{stats.recent.map((r) => (
										<li
											key={r.playedAt}
											className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
										>
											<span className="flex items-center gap-2">
												{r.word}
												{r.wasImpostor && (
													<Badge variant="destructive">
														impostor
													</Badge>
												)}
											</span>
											<span
												className={
													r.won
														? "text-primary"
														: "text-muted-foreground"
												}
											>
												{r.won
													? "wygrana"
													: "przegrana"}{" "}
												· {r.points} pkt
											</span>
										</li>
									))}
								</ul>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
