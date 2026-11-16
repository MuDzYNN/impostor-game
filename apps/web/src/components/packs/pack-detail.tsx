"use client";

import { use, useEffect, useState } from "react";
import { browser } from "react-dom";
import { useRouter } from "next/navigation";
import { categoriesOf } from "@impostor/game";
import { CopyIcon, PencilIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";
import { api, type Pack } from "@/lib/api";
import { storage } from "@/lib/storage";
import { PackEditor } from "./pack-editor";
import { VisibilityBadge } from "./visibility-badge";

export function PackDetail({ id }: { id: string }) {
	use(browser("Ostatnio otwarte paczki są w localStorage"));

	const router = useRouter();
	const { me } = useMe();
	const [pack, setPack] = useState<Pack | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);

	useEffect(() => {
		api<Pack>(`/packs/${id}`)
			.then((p) => {
				setPack(p);
				if (p.visibility === "PRIVATE" && !p.mine)
					storage.rememberPack({ id: p.id, name: p.name });
			})
			.catch((err: Error) => setError(err.message));
	}, [id, me?.id]);

	if (error) return <p className="text-muted-foreground">{error}</p>;
	if (!pack) return <p className="text-muted-foreground">Ładowanie…</p>;

	if (editing) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Edycja paczki</CardTitle>
				</CardHeader>
				<CardContent>
					<PackEditor
						pack={pack}
						onSaved={(p) => {
							setPack(p);
							setEditing(false);
						}}
					/>
				</CardContent>
			</Card>
		);
	}

	const current = pack;
	const canEdit = current.mine || me?.isAdmin;
	const categories = categoriesOf(current.words);

	async function remove() {
		if (!confirm(`Usunąć paczkę "${current.name}"?`)) return;
		try {
			await api(`/packs/${id}`, { method: "DELETE" });
			router.push("/packs");
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	function playLocally() {
		storage.setSettings({
			...storage.settings(),
			packIds: [id],
			categories: [],
		});
		router.push("/local");
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-black tracking-tight">
						{current.name}
					</h1>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<VisibilityBadge pack={current} />
						{current.words.length} słów
						{current.ownerName && ` · autor: ${current.ownerName}`}
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button onClick={playLocally}>
						<PlayIcon /> Graj lokalnie
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							void navigator.clipboard.writeText(
								window.location.href,
							);
							toast.success("Skopiowano link");
						}}
					>
						<CopyIcon /> Link
					</Button>
					{canEdit && (
						<>
							<Button
								variant="outline"
								onClick={() => setEditing(true)}
							>
								<PencilIcon /> Edytuj
							</Button>
							<Button variant="destructive" onClick={remove}>
								<Trash2Icon /> Usuń
							</Button>
						</>
					)}
				</div>
			</div>

			{categories.map((c) => (
				<section key={c} className="flex flex-col gap-2">
					<h2 className="font-semibold">{c}</h2>
					<div className="flex flex-wrap gap-1.5">
						{current.words
							.filter((w) => w.category === c)
							.map((w) => (
								<Badge
									key={w.word}
									variant="secondary"
									title={
										w.hint
											? `Podpowiedź: ${w.hint}`
											: undefined
									}
								>
									{w.word}
								</Badge>
							))}
					</div>
				</section>
			))}
		</div>
	);
}
