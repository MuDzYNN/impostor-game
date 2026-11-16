"use client";

import { MotionConfig } from "motion/react";
import { MeProvider } from "@/hooks/use-me";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<MotionConfig
			reducedMotion="user"
			transition={{ type: "spring", stiffness: 260, damping: 26 }}
		>
			<MeProvider>{children}</MeProvider>
		</MotionConfig>
	);
}
