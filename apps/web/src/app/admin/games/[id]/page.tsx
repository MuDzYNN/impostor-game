import { Suspense } from "react";
import { GameDetail } from "@/components/admin/game-detail";
import { ListFallback } from "@/components/page-fallback";

async function Detail({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <GameDetail id={id} />;
}

export default function AdminGamePage({
	params,
}: PageProps<"/admin/games/[id]">) {
	return (
		<Suspense fallback={<ListFallback />}>
			<Detail params={params} />
		</Suspense>
	);
}
