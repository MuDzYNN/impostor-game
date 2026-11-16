import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ServiceWorker } from "@/components/service-worker";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin", "latin-ext"],
});

const display = Bricolage_Grotesque({
	variable: "--font-display",
	subsets: ["latin", "latin-ext"],
});

const description =
	"Imprezowa gra w skojarzenia: wszyscy znają hasło, oprócz impostora. Grajcie na jednym telefonie albo w pokoju online.";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "Impostor: gra imprezowa w skojarzenia",
		template: "%s · Impostor",
	},
	description,
	applicationName: "Impostor",
	keywords: [
		"impostor",
		"gra imprezowa",
		"gra w skojarzenia",
		"gra na imprezę",
		"gra online ze znajomymi",
		"kto jest impostorem",
	],
	openGraph: {
		type: "website",
		locale: "pl_PL",
		siteName: "Impostor",
		title: "Impostor: gra imprezowa w skojarzenia",
		description,
	},
	twitter: {
		card: "summary_large_image",
		title: "Impostor: gra imprezowa w skojarzenia",
		description,
	},
};

export const viewport: Viewport = {
	themeColor: "#120f1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="pl"
			className={`${geistSans.variable} ${geistMono.variable} ${display.variable} dark h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">
				<Providers>
					<SiteHeader />
					<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:py-10">
						{children}
					</main>
				</Providers>
				<Toaster theme="dark" position="top-center" />
				<ServiceWorker />
			</body>
		</html>
	);
}
