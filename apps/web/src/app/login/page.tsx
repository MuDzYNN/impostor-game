"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api, loginUrl } from "@/lib/api";

const LABELS: Record<string, string> = { discord: "Discord", google: "Google" };

export default function LoginPage() {
	const [providers, setProviders] = useState<string[] | null>(null);

	useEffect(() => {
		api<string[]>("/auth/providers")
			.then(setProviders)
			.catch(() => setProviders([]));
	}, []);

	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardHeader>
				<CardTitle>Zaloguj się</CardTitle>
				<CardDescription>
					Konto nie jest potrzebne do gry. Daje własne paczki słów,
					statystyki i stały nick.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{providers === null ? (
					<p className="text-sm text-muted-foreground">Ładowanie…</p>
				) : providers.length ? (
					providers.map((p) => (
						<Button
							key={p}
							size="lg"
							variant="outline"
							nativeButton={false}
							render={<a href={loginUrl(p, "/profile")} />}
						>
							Kontynuuj przez {LABELS[p] ?? p}
						</Button>
					))
				) : (
					<p className="text-sm text-muted-foreground">
						Logowanie nie jest skonfigurowane na tym serwerze.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
