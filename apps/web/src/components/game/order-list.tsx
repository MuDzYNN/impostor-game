"use client";

import { motion } from "motion/react";
import { MegaphoneIcon } from "lucide-react";
import { PlayerAvatar } from "./player-avatar";

export function OrderList({
	order,
	nameOf,
}: {
	order: string[];
	nameOf: (id: string) => string;
}) {
	const starter = nameOf(order[0]);

	return (
		<div className="flex w-full flex-col items-center gap-8">
			<motion.div
				className="flex flex-col items-center gap-3 text-center"
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
			>
				<span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
					<MegaphoneIcon className="size-4" /> Zaczyna
				</span>
				<div className="relative">
					<span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
					<PlayerAvatar
						name={starter}
						className="relative size-20 text-3xl ring-4 ring-primary/60"
					/>
				</div>
				<span className="font-heading text-5xl font-extrabold tracking-tight">
					{starter}
				</span>
			</motion.div>

			<ol className="flex w-full max-w-sm flex-col gap-2">
				{order.map((id, i) => (
					<motion.li
						key={id}
						initial={{ opacity: 0, x: -16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.15 + i * 0.06 }}
						className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2"
					>
						<span className="w-5 text-right font-heading font-bold text-muted-foreground tabular-nums">
							{i + 1}
						</span>
						<PlayerAvatar
							name={nameOf(id)}
							className="size-7 text-xs"
						/>
						<span className="font-medium">{nameOf(id)}</span>
					</motion.li>
				))}
			</ol>

			<p className="max-w-sm text-center text-sm text-muted-foreground">
				Po kolei mówcie na głos po jednym skojarzeniu z hasłem. Impostor
				musi udawać, że też je zna.
			</p>
		</div>
	);
}
