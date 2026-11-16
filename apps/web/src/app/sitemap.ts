import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: SITE_URL, changeFrequency: "monthly", priority: 1 },
		{ url: `${SITE_URL}/local`, changeFrequency: "monthly", priority: 0.8 },
		{ url: `${SITE_URL}/packs`, changeFrequency: "weekly", priority: 0.6 },
	];
}
