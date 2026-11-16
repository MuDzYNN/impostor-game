"use client";

import { useCallback, useEffect, useState } from "react";
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
import { api, type PackSummary } from "@/lib/api";

export default function AdminPage() {
	const { me, loading } = useMe();
	const { packs } = usePacks();
	const [pending, setPending] = useState<PackSummary[] | null>(null);

	const load = useCallback(() => {
		api<PackSummary[]>("/admin/packs/pending")
			.then(setPending)
			.catch((err: Error) => toast.error(err.message));
	}, []);

	useEffect(() => {
		if (me?.isAdmin) load();
	}, [me, load]);

	if (loading) return <p className="text-muted-foreground">Ładowanie…</p>;
	if (!me?.isAdmin)
		return (
			<p className="text-muted-foreground">Tylko dla administratorów.</p>
		);

	async function moderate(id: string, approve: boolean) {
		try {
			await api(`/admin/packs/${id}/${approve ? "approve" : "reject"}`, {
				method: "POST",
			});
			load();
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	const official = (packs ?? []).filter((p) => p.visibility === "OFFICIAL");

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Oficjalne paczki</CardTitle>
					<CardDescription>
						Z nich losowane są słowa, gdy gracze nie wybiorą nic
						innego.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{official.map((p) => (
						<Link
							key={p.id}
							href={`/packs/${p.id}`}
							className="rounded-md bg-muted/50 px-3 py-1.5 hover:bg-muted"
						>
							{p.name}{" "}
							<span className="text-muted-foreground">
								({p.wordCount})
							</span>
						</Link>
					))}
					<Button
						className="self-start"
						variant="outline"
						nativeButton={false}
						render={<Link href="/packs/new" />}
					>
						<PlusIcon /> Nowa paczka
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Do moderacji</CardTitle>
					<CardDescription>
						Publiczne paczki czekające na akceptację.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{pending === null ? (
						<p className="text-muted-foreground">Ładowanie…</p>
					) : !pending.length ? (
						<p className="text-muted-foreground">Nic nie czeka.</p>
					) : (
						pending.map((p) => (
							<div
								key={p.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2"
							>
								<Link
									href={`/packs/${p.id}`}
									className="hover:underline"
								>
									{p.name}{" "}
									<span className="text-muted-foreground">
										· {p.ownerName} · {p.wordCount} słów
									</span>
								</Link>
								<div className="flex gap-2">
									<Button
										size="sm"
										onClick={() => moderate(p.id, true)}
									>
										Akceptuj
									</Button>
									<Button
										size="sm"
										variant="destructive"
										onClick={() => moderate(p.id, false)}
									>
										Odrzuć
									</Button>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
