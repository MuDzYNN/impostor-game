import { Suspense } from "react";
import { GamesList } from "@/components/admin/games-list";
import { ListFallback } from "@/components/page-fallback";

export default function AdminGamesPage() {
	return (
		<Suspense fallback={<ListFallback />}>
			<GamesList />
		</Suspense>
	);
}
