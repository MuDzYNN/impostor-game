"use client";

import type { Phase } from "@impostor/game";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import type { AdminRoom } from "@/lib/api";
import { cn } from "@/lib/utils";

const PHASES: Record<Phase, string> = {
	LOBBY: "Lobby",
	REVEAL: "Rozdawanie kart",
	PLAYING: "Skojarzenia",
	VOTING: "Głosowanie",
	RESULT: "Wynik",
};

function since(date: string) {
	const minutes = Math.floor((Date.now() - Date.parse(date)) / 60_000);
	if (minutes < 1) return "chwili";
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export default function AdminRoomsPage() {
	const { data: rooms } = useAdmin<AdminRoom[]>("/admin/rooms", 5_000);

	if (!rooms) return <p className="text-muted-foreground">Ładowanie…</p>;
	if (!rooms.length)
		return <p className="text-muted-foreground">Nie ma aktywnych pokoi.</p>;

	return (
		<div className="flex flex-col gap-4">
			{rooms.map((r) => (
				<Card key={r.code}>
					<CardHeader>
						<CardTitle className="flex flex-wrap items-center gap-2">
							<span className="font-mono tracking-widest">
								{r.code}
							</span>
							<Badge variant="secondary">{PHASES[r.phase]}</Badge>
							{r.roundNo > 0 && (
								<Badge variant="outline">
									Runda {r.roundNo}
								</Badge>
							)}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Host: {r.hostName ?? "-"} · online{" "}
							{r.members.filter((m) => m.connected).length}/
							{r.members.length} · od {since(r.createdAt)}
						</p>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						{r.members.map((m) => (
							<span
								key={m.name}
								className={cn(
									"rounded-md bg-muted/50 px-2 py-1 text-sm",
									!m.connected &&
										"text-muted-foreground line-through",
								)}
							>
								{m.name}
								{m.spectator && " (widz)"}
								{m.loggedIn && (
									<span className="text-primary"> ●</span>
								)}
							</span>
						))}
					</CardContent>
				</Card>
			))}
			<p className="text-xs text-muted-foreground">
				<span className="text-primary">●</span> zalogowany ·
				przekreślony: rozłączony · odświeża się co 5 s
			</p>
		</div>
	);
}
