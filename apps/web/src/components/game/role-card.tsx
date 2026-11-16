"use client";

import { useState } from "react";
import type { Card } from "@impostor/game";
import { motion } from "motion/react";
import { FingerprintIcon, SkullIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./player-avatar";

function wordSize(word: string) {
	if (word.length > 14) return "text-3xl";
	if (word.length > 9) return "text-4xl";
	return "text-5xl";
}

const face =
	"absolute inset-0 flex flex-col items-center rounded-3xl border p-6 text-center [backface-visibility:hidden]";

export function RoleCard({
	card,
	playerName,
	onSeen,
	className,
}: {
	card: Card;
	playerName?: string;
	onSeen?: () => void;
	className?: string;
}) {
	const [shown, setShown] = useState(false);

	function show(e: React.PointerEvent) {
		e.currentTarget.setPointerCapture(e.pointerId);
		if (!shown) navigator.vibrate?.(15);
		setShown(true);
		onSeen?.();
	}

	const impostor = card.role === "impostor";

	return (
		<div
			className={cn(
				"w-[min(78vw,300px)] [perspective:1200px]",
				className,
			)}
		>
			<motion.button
				type="button"
				aria-label="Przytrzymaj, aby zobaczyć kartę"
				className="relative block aspect-[5/7] w-full touch-none select-none [transform-style:preserve-3d] focus-visible:outline-none"
				animate={{ rotateY: shown ? 180 : 0, scale: shown ? 1.03 : 1 }}
				transition={{ type: "spring", stiffness: 220, damping: 22 }}
				whileHover={{ y: -4 }}
				onPointerDown={show}
				onPointerUp={() => setShown(false)}
				onPointerCancel={() => setShown(false)}
				onKeyDown={(e) => {
					if (e.key !== " " || shown) return;
					setShown(true);
					onSeen?.();
				}}
				onKeyUp={() => setShown(false)}
				onContextMenu={(e) => e.preventDefault()}
			>
				<div
					className={cn(
						face,
						"card-pattern justify-between border-primary/30 bg-card shadow-2xl shadow-primary/20",
					)}
				>
					<span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Twoja karta
					</span>
					<div className="flex flex-col items-center gap-3">
						{playerName ? (
							<>
								<PlayerAvatar
									name={playerName}
									className="size-16 text-2xl"
								/>
								<span className="font-heading text-4xl font-extrabold break-all">
									{playerName}
								</span>
							</>
						) : (
							<span className="font-heading text-6xl font-extrabold text-primary">
								?
							</span>
						)}
					</div>
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<FingerprintIcon className="size-10 animate-pulse text-primary" />
						<span className="text-sm">Przytrzymaj, aby odkryć</span>
					</div>
				</div>

				<div
					className={cn(
						face,
						"justify-between [transform:rotateY(180deg)]",
						impostor
							? "border-destructive/50 bg-[radial-gradient(circle_at_50%_30%,oklch(0.45_0.2_22),oklch(0.17_0.05_22))] shadow-2xl shadow-destructive/30"
							: "border-crew/40 bg-[radial-gradient(circle_at_50%_30%,oklch(0.38_0.09_200),oklch(0.16_0.03_240))] shadow-2xl shadow-crew/20",
					)}
				>
					<span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
						{playerName ?? "Twoja rola"}
					</span>
					{impostor ? (
						<div className="flex flex-col items-center gap-3">
							<SkullIcon className="size-12 text-white/90" />
							<span className="font-heading text-4xl font-extrabold tracking-tight text-white">
								IMPOSTOR
							</span>
							<span className="text-sm text-white/70">
								Nie znasz hasła. Udawaj, że znasz.
							</span>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2">
							<span className="text-xs uppercase tracking-[0.3em] text-white/60">
								Hasło
							</span>
							<span
								className={cn(
									"font-heading font-extrabold leading-none tracking-tight text-white break-words",
									wordSize(card.word),
								)}
							>
								{card.word}
							</span>
						</div>
					)}
					<div className="flex flex-col items-center gap-1.5">
						{card.category && (
							<span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
								{card.category}
							</span>
						)}
						{impostor && card.hint && (
							<span className="text-sm text-white/80">
								Podpowiedź:{" "}
								<b className="text-white">{card.hint}</b>
							</span>
						)}
					</div>
				</div>
			</motion.button>
		</div>
	);
}
