"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pager } from "@/components/admin/pager";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/use-admin";
import type { AdminGame } from "@/lib/api";

export function formatDate(date: string) {
	return new Date(date).toLocaleString("pl-PL", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

export function Outcome({ caught }: { caught: boolean | null }) {
	if (caught === null) return null;
	return caught ? (
		<Badge variant="secondary">impostor złapany</Badge>
	) : (
		<Badge variant="destructive">impostor wygrał</Badge>
	);
}

export function GamesList() {
	const router = useRouter();
	const params = useSearchParams();
	const page = Number(params.get("page")) || 1;
	const userId = params.get("user");
	const { data } = useAdmin<{
		user: { id: string; name: string } | null;
		games: AdminGame[];
		pages: number;
	}>(
		`/admin/games?page=${page}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`,
	);

	if (!data) return <p className="text-muted-foreground">Ładowanie…</p>;

	return (
		<div className="flex flex-col gap-4">
			{data.user && (
				<p className="text-sm">
					Gry gracza <strong>{data.user.name}</strong> ·{" "}
					<Link
						href="/admin/games"
						className="text-primary hover:underline"
					>
						pokaż wszystkie
					</Link>
				</p>
			)}
			{!data.games.length ? (
				<p className="text-muted-foreground">Brak rozegranych gier.</p>
			) : (
				<ul className="flex flex-col gap-1">
					{data.games.map((g) => (
						<li key={g.id}>
							<Link
								href={`/admin/games/${g.id}`}
								className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
							>
								<span className="flex items-center gap-2">
									<strong>{g.word}</strong>
									<span className="text-muted-foreground">
										{g.category}
									</span>
								</span>
								<span className="flex flex-wrap items-center gap-2 text-muted-foreground">
									<Outcome caught={g.caught} />
									<span>
										gracze: {g.players} ·{" "}
										<span className="font-mono">
											{g.roomCode}
										</span>{" "}
										· {formatDate(g.playedAt)}
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
			<Pager
				page={page}
				pages={data.pages}
				onPage={(p) =>
					router.push(
						`/admin/games?page=${p}${userId ? `&user=${encodeURIComponent(userId)}` : ""}`,
					)
				}
			/>
		</div>
	);
}
