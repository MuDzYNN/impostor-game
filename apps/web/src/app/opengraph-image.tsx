import { ImageResponse } from "next/og";

export const alt = "Impostor: gra imprezowa w skojarzenia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Kto tu kłamie?";
const TAGLINE = "Gra imprezowa · 3-20 osób";

async function loadFont(text: string) {
	"use cache";
	const css = await fetch(
		`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&text=${encodeURIComponent(text)}`,
	).then((res) => res.text());
	const url = css.match(/src: url\((.+?)\) format/)?.[1];
	if (!url) throw new Error("Font not found");
	return fetch(url).then((res) => res.arrayBuffer());
}

export default async function OpengraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 40,
				background:
					"radial-gradient(circle at 10% 0%, #4c1d6e 0%, transparent 55%), radial-gradient(circle at 100% 100%, #5a1a24 0%, transparent 50%), #120f1c",
				color: "#f5f3fa",
				fontFamily: "Bricolage",
			}}
		>
			<svg width="160" height="160" viewBox="0 0 512 512">
				<path
					d="M120 120h272a40 40 0 0 1 40 40v168a40 40 0 0 1-40 40H230l-86 64v-64h-24a40 40 0 0 1-40-40V160a40 40 0 0 1 40-40z"
					fill="#fafafa"
				/>
				<path
					d="M214 200a42 42 0 1 1 63 36c-14 8-21 18-21 34v6"
					fill="none"
					stroke="#ef4444"
					strokeWidth="32"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<circle cx="256" cy="324" r="20" fill="#ef4444" />
			</svg>
			<div style={{ fontSize: 112, letterSpacing: -3 }}>{TITLE}</div>
			<div style={{ fontSize: 40, color: "#b8b0cc" }}>{TAGLINE}</div>
		</div>,
		{
			...size,
			fonts: [
				{
					name: "Bricolage",
					data: await loadFont(TITLE + TAGLINE),
					weight: 800,
				},
			],
		},
	);
}
