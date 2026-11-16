import { Suspense } from "react";
import { ListFallback } from "@/components/page-fallback";
import { PackDetail } from "@/components/packs/pack-detail";

export const metadata = { title: "Paczka słów" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <PackDetail id={id} />;
}

export default function PackPage({ params }: PageProps<"/packs/[id]">) {
	return (
		<Suspense fallback={<ListFallback />}>
			<Detail params={params} />
		</Suspense>
	);
}
