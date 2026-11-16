import { Suspense } from "react";
import { LocalGame } from "@/components/game/local-game";
import { CardsFallback } from "@/components/page-fallback";

export const metadata = {
	title: "Gra lokalna",
	description:
		"Gra na jednym urządzeniu. Podajecie sobie telefon i każdy po kolei odkrywa swoją kartę.",
	alternates: { canonical: "/local" },
};

export default function LocalPage() {
	return (
		<Suspense fallback={<CardsFallback />}>
			<LocalGame />
		</Suspense>
	);
}
