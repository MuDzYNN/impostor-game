"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackEditor } from "@/components/packs/pack-editor";
import { useMe } from "@/hooks/use-me";

export default function NewPackPage() {
	const router = useRouter();
	const { me, loading } = useMe();

	if (loading) return <p className="text-muted-foreground">Ładowanie…</p>;
	if (!me)
		return (
			<p className="text-muted-foreground">
				Zaloguj się, żeby tworzyć paczki.
			</p>
		);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Nowa paczka</CardTitle>
			</CardHeader>
			<CardContent>
				<PackEditor onSaved={(p) => router.push(`/packs/${p.id}`)} />
			</CardContent>
		</Card>
	);
}
