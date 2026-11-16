import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Impostor",
		short_name: "Impostor",
		description:
			"Imprezowa gra w skojarzenia: wszyscy znają hasło, oprócz impostora.",
		start_url: "/",
		display: "standalone",
		background_color: "#120f1c",
		theme_color: "#120f1c",
		lang: "pl",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
			{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
		],
	};
}
