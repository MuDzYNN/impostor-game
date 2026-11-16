import { cn } from "@/lib/utils";

export function hueOf(name: string): number {
	let hash = 0;
	for (const ch of name.toLowerCase())
		hash = (hash * 31 + ch.charCodeAt(0)) | 0;
	return (Math.abs(hash) % 12) * 30;
}

export function PlayerAvatar({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	const hue = hueOf(name);
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-8 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold text-white",
				className,
			)}
			style={{
				background: `linear-gradient(135deg, oklch(0.7 0.18 ${hue}), oklch(0.5 0.2 ${hue + 30}))`,
			}}
		>
			{name.slice(0, 1).toUpperCase()}
		</span>
	);
}
