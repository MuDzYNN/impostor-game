import { Suspense } from "react";
import { HomeActions } from "@/components/home/home-actions";
import { CardsFallback } from "@/components/page-fallback";
import { SITE_URL } from "@/lib/utils";

export const metadata = { alternates: { canonical: "/" } };

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: "Impostor",
	url: SITE_URL,
	description:
		"Imprezowa gra w skojarzenia: wszyscy znają hasło, oprócz impostora.",
	applicationCategory: "GameApplication",
	operatingSystem: "Any",
	inLanguage: "pl",
	offers: { "@type": "Offer", price: "0", priceCurrency: "PLN" },
};

export default function Home() {
	return (
		<div className="flex flex-col gap-10">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<section className="flex flex-col gap-4 pt-4 text-center sm:pt-8">
				<span className="mx-auto rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
					Gra imprezowa · 3-20 osób
				</span>
				<h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
					Kto tu <span className="text-gradient">kłamie</span>?
				</h1>
				<p className="mx-auto max-w-xl text-lg text-muted-foreground">
					Wszyscy dostają to samo hasło, oprócz impostora. Mówicie po
					kolei skojarzenia i próbujecie wyłapać, kto nie ma pojęcia,
					o czym gadacie.
				</p>
			</section>
			<Suspense fallback={<CardsFallback />}>
				<HomeActions />
			</Suspense>
		</div>
	);
}
