"use client";

import { GamesChart } from "@/components/admin/games-chart";
import { Stat } from "@/components/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import type { AdminStats } from "@/lib/api";

export default function AdminPage() {
	const { data: stats } = useAdmin<AdminStats>("/admin/stats", 30_000);

	if (!stats) return <p className="text-muted-foreground">Ładowanie…</p>;

	const topCategory = Math.max(1, ...stats.categories.map((c) => c.games));

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<Stat label="aktywne pokoje" value={stats.activeRooms} />
				<Stat label="graczy online" value={stats.onlinePlayers} />
				<Stat label="rozegrane rundy" value={stats.games} />
				<Stat label="rundy (24h)" value={stats.gamesDay} />
				<Stat label="rundy (7 dni)" value={stats.gamesWeek} />
				<Stat
					label="impostor złapany"
					value={
						stats.caughtRate === null
							? "-"
							: `${Math.round(stats.caughtRate * 100)}%`
					}
				/>
				<Stat label="użytkownicy" value={stats.users} />
				<Stat label="nowi (7 dni)" value={stats.usersWeek} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Rundy dziennie, ostatnie 30 dni</CardTitle>
				</CardHeader>
				<CardContent>
					<GamesChart data={stats.perDay} />
				</CardContent>
			</Card>

			{stats.categories.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Najczęstsze kategorie</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{stats.categories.map((c) => (
							<div
								key={c.category}
								className="flex items-center gap-3 text-sm"
							>
								<span className="w-28 shrink-0 truncate">
									{c.category}
								</span>
								<div className="flex flex-1 items-center gap-2">
									<div
										className="h-3 rounded-r-[4px] bg-primary"
										style={{
											width: `${(c.games / topCategory) * 100}%`,
										}}
									/>
									<span className="text-xs text-muted-foreground tabular-nums">
										{c.games}
									</span>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
