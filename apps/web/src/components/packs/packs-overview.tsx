"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";
import { usePacks } from "@/hooks/use-packs";
import { storage } from "@/lib/storage";
import { formatWordLines, parseWordLines } from "@/lib/words";
import { WordLinesField } from "./pack-editor";
import { VisibilityBadge } from "./visibility-badge";

export function PacksOverview() {
	use(browser("Własne słowa są w localStorage"));

	const { me } = useMe();
	const { packs, offline } = usePacks();
	const [lines, setLines] = useState(() =>
		formatWordLines(storage.localWords()),
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-4xl font-extrabold tracking-tight">
					Paczki słów
				</h1>
				{me ? (
					<Button
						nativeButton={false}
						render={<Link href="/packs/new" />}
					>
						<PlusIcon /> Nowa paczka
					</Button>
				) : (
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={<Link href="/login" />}
					>
						Zaloguj się, by tworzyć własne
					</Button>
				)}
			</div>

			{offline ? (
				<p className="text-muted-foreground">
					Brak połączenia z serwerem.
				</p>
			) : (
				<ul className="grid gap-2 sm:grid-cols-2">
					{(packs ?? []).map((p) => (
						<li key={p.id}>
							<Link
								href={`/packs/${p.id}`}
								className="flex flex-col gap-1 rounded-2xl border bg-card/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50"
							>
								<span className="flex items-center justify-between gap-2 font-medium">
									{p.name}
									<VisibilityBadge pack={p} />
								</span>
								<span className="text-sm text-muted-foreground">
									{p.wordCount
										? `${p.wordCount} słów`
										: "otwarta z linku"}
									{p.ownerName && ` · ${p.ownerName}`}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Moje słowa na tym urządzeniu</CardTitle>
					<CardDescription>
						Bez konta. Działają tylko w grze lokalnej na tym
						urządzeniu.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<WordLinesField value={lines} onChange={setLines} />
					<Button
						className="self-start"
						onClick={() => {
							storage.setLocalWords(parseWordLines(lines));
							toast.success("Zapisano");
						}}
					>
						Zapisz
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
