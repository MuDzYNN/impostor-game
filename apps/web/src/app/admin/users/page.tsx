"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pager } from "@/components/admin/pager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-me";
import { api, type AdminUser } from "@/lib/api";

const PROVIDERS: Record<string, string> = {
	discord: "Discord",
	google: "Google",
};

export default function AdminUsersPage() {
	const { me } = useMe();
	const [q, setQ] = useState("");
	const [page, setPage] = useState(1);
	const { data, reload } = useAdmin<{ users: AdminUser[]; pages: number }>(
		`/admin/users?page=${page}&q=${encodeURIComponent(q.trim())}`,
	);

	async function setAdmin(user: AdminUser, isAdmin: boolean) {
		try {
			await api(`/admin/users/${user.id}/admin`, {
				method: "POST",
				body: JSON.stringify({ isAdmin }),
			});
			reload();
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Input
				value={q}
				onChange={(e) => {
					setQ(e.target.value);
					setPage(1);
				}}
				placeholder="Szukaj po nicku"
				aria-label="Szukaj po nicku"
				className="max-w-sm"
			/>
			{!data ? (
				<p className="text-muted-foreground">Ładowanie…</p>
			) : !data.users.length ? (
				<p className="text-muted-foreground">Nikogo nie znaleziono.</p>
			) : (
				<ul className="flex flex-col gap-1">
					{data.users.map((u) => (
						<li
							key={u.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
						>
							<span className="flex items-center gap-3">
								<Avatar className="size-8">
									{u.avatarUrl && (
										<AvatarImage src={u.avatarUrl} alt="" />
									)}
									<AvatarFallback>
										{u.name.slice(0, 1).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span className="flex flex-col">
									<span className="flex items-center gap-2 font-medium">
										{u.name}
										{u.isAdmin && <Badge>admin</Badge>}
									</span>
									<span className="text-xs text-muted-foreground">
										{u.providers
											.map((p) => PROVIDERS[p] ?? p)
											.join(", ")}{" "}
										· od{" "}
										{new Date(
											u.createdAt,
										).toLocaleDateString("pl-PL")}{" "}
										· paczki: {u.packs}
									</span>
								</span>
							</span>
							<span className="flex items-center gap-4">
								<Link
									href={`/admin/games?user=${u.id}`}
									className="text-primary hover:underline"
								>
									gry: {u.games}
								</Link>
								<label className="flex items-center gap-2 text-muted-foreground">
									admin
									<Switch
										checked={u.isAdmin}
										disabled={u.id === me?.id}
										onCheckedChange={(v) => setAdmin(u, v)}
									/>
								</label>
							</span>
						</li>
					))}
				</ul>
			)}
			{data && <Pager page={page} pages={data.pages} onPage={setPage} />}
		</div>
	);
}
