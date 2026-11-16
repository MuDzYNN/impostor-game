"use client";

import { AnimatePresence, motion } from "motion/react";

/** Cross-fades children whenever `id` changes */
export function PhaseTransition({
	id,
	children,
}: {
	id: string;
	children: React.ReactNode;
}) {
	return (
		<AnimatePresence mode="wait" initial={false}>
			<motion.div
				key={id}
				initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
				animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
				exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="flex w-full flex-col"
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
