"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { formatDate, Outcome } from "@/components/admin/games-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import type { AdminGameDetail } from "@/lib/api";

export function GameDetail({ id }: { id: string }) {
	const { data: game } = useAdmin<AdminGameDetail>(`/admin/games/${id}`);

	return (
		<div className="flex flex-col gap-4">
			<Button
				variant="ghost"
				size="sm"
				className="self-start"
				nativeButton={false}
				render={<Link href="/admin/games" />}
			>
				<ArrowLeftIcon /> Wszystkie gry
			</Button>
			{!game ? (
				<p className="text-muted-foreground">Ładowanie…</p>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="flex flex-wrap items-center gap-2">
							{game.word}
							<Outcome caught={game.caught} />
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{game.category} · pokój{" "}
							<span className="font-mono">{game.roomCode}</span> ·{" "}
							{formatDate(game.playedAt)}
						</p>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-col gap-1">
							{game.participants.map((p) => (
								<li
									key={p.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
								>
									<span className="flex flex-wrap items-center gap-2">
										{p.name}
										{p.wasImpostor && (
											<Badge variant="destructive">
												impostor
											</Badge>
										)}
										{p.user && (
											<Link
												href={`/admin/games?user=${p.user.id}`}
												className="text-xs text-primary hover:underline"
											>
												konto: {p.user.name}
											</Link>
										)}
									</span>
									<span
										className={
											p.won
												? "text-primary"
												: "text-muted-foreground"
										}
									>
										{p.won ? "wygrana" : "przegrana"} ·{" "}
										{p.points} pkt
									</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
