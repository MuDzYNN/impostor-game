import { Suspense } from "react";
import { ListFallback } from "@/components/page-fallback";
import { PacksOverview } from "@/components/packs/packs-overview";

export const metadata = {
	title: "Paczki słów",
	description:
		"Gotowe paczki haseł do Impostora i paczki od graczy. Załóż konto i zrób własną.",
	alternates: { canonical: "/packs" },
};

export default function PacksPage() {
	return (
		<Suspense fallback={<ListFallback />}>
			<PacksOverview />
		</Suspense>
	);
}
