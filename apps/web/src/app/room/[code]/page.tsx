import { Suspense } from "react";
import { OnlineRoom } from "@/components/game/online-room";
import { Spinner } from "@/components/page-fallback";

export const metadata = {
	title: "Pokój",
	robots: { index: false },
};

async function Room({ params }: { params: Promise<{ code: string }> }) {
	const { code } = await params;
	return <OnlineRoom code={code.toUpperCase()} />;
}

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
	return (
		<Suspense fallback={<Spinner label="Łączenie z pokojem…" />}>
			<Room params={params} />
		</Suspense>
	);
}
