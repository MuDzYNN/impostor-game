"use client";

import { useState } from "react";
import type { Guess, Outcome } from "@impostor/game";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2Icon, SkullIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./player-avatar";

interface Props {
	/** null while the impostor is still guessing */
	word: string | null;
	category: string;
	impostorIds: string[];
	nameOf: (id: string) => string;
	outcome?: Outcome | null;
	guess: Guess | null;
	/** Shown when this viewer may still guess the word */
	onGuess?: (text: string) => void;
	onSkip?: () => void;
}

export function ResultView({
	word,
	category,
	impostorIds,
	nameOf,
	outcome,
	guess,
	onGuess,
	onSkip,
}: Props) {
	const [text, setText] = useState("");
	const plural = impostorIds.length > 1;
	const maxVotes = outcome
		? Math.max(1, ...Object.values(outcome.counts))
		: 1;

	return (
		<div className="flex w-full flex-col items-center gap-8 text-center">
			{outcome && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className={cn(
						"flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
						outcome.caught
							? "bg-crew/15 text-crew"
							: "bg-destructive/15 text-destructive",
					)}
				>
					{outcome.caught ? (
						<CheckCircle2Icon className="size-4" />
					) : (
						<XCircleIcon className="size-4" />
					)}
					{outcome.caught
						? "Impostor złapany!"
						: outcome.accusedId
							? `${nameOf(outcome.accusedId)} był(a) niewinny(a)`
							: "Remis, impostor się wywinął"}
				</motion.div>
			)}

			<div className="flex flex-col items-center gap-4">
				<motion.span
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground"
				>
					{plural ? "Impostorami byli" : "Impostorem był(a)"}
				</motion.span>
				<div className="flex flex-wrap justify-center gap-6">
					{impostorIds.map((id, i) => (
						<motion.div
							key={id}
							initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
							animate={{ scale: 1, opacity: 1, rotate: 0 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 12,
								delay: 0.35 + i * 0.15,
							}}
							className="flex flex-col items-center gap-2"
						>
							<div className="relative">
								<PlayerAvatar
									name={nameOf(id)}
									className="size-20 text-3xl shadow-[0_0_60px_-5px_var(--destructive)] ring-4 ring-destructive"
								/>
								<SkullIcon className="absolute -right-2 -bottom-1 size-8 rounded-full bg-destructive p-1.5 text-white" />
							</div>
							<span className="font-heading text-4xl font-extrabold tracking-tight text-destructive">
								{nameOf(id)}
							</span>
						</motion.div>
					))}
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.7 }}
				className="flex w-full max-w-sm flex-col items-center gap-1 rounded-2xl border bg-card/60 px-6 py-5"
			>
				<span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
					Hasło
				</span>
				<AnimatePresence mode="wait">
					{word === null ? (
						<motion.span
							key="hidden"
							exit={{ opacity: 0, scale: 0.8 }}
							className="py-1 text-lg text-muted-foreground"
						>
							Impostor próbuje je zgadnąć…
						</motion.span>
					) : (
						<motion.span
							key="word"
							initial={{ opacity: 0, rotateX: 90 }}
							animate={{ opacity: 1, rotateX: 0 }}
							className="font-heading text-4xl font-extrabold tracking-tight"
						>
							{word}
						</motion.span>
					)}
				</AnimatePresence>
				<span className="text-sm text-muted-foreground">
					{category}
				</span>
			</motion.div>

			{guess ? (
				guess.text && (
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className={
							guess.correct
								? "font-semibold text-destructive"
								: "text-muted-foreground"
						}
					>
						Impostor strzelał „{guess.text}”{" "}
						{guess.correct ? "i trafił! +1 pkt" : "i nie trafił"}
					</motion.p>
				)
			) : (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.9 }}
					className="flex w-full max-w-sm flex-col items-center gap-2"
				>
					{onGuess && (
						<form
							className="flex w-full gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								if (text.trim()) onGuess(text);
							}}
						>
							<Input
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Jakie było hasło?"
								autoComplete="off"
								className="h-12 rounded-xl text-base"
							/>
							<Button type="submit" size="xl">
								Strzelam
							</Button>
						</form>
					)}
					{onSkip && (
						<Button variant="ghost" size="sm" onClick={onSkip}>
							Pomiń zgadywanie
						</Button>
					)}
				</motion.div>
			)}

			{outcome && Object.keys(outcome.counts).length > 0 && (
				<div className="flex w-full max-w-sm flex-col gap-2">
					<span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Głosy
					</span>
					{Object.entries(outcome.counts)
						.sort((a, b) => b[1] - a[1])
						.map(([id, n], i) => (
							<div key={id} className="flex items-center gap-3">
								<PlayerAvatar
									name={nameOf(id)}
									className="size-7 text-xs"
								/>
								<div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/60">
									<motion.div
										className={cn(
											"absolute inset-y-0 left-0 rounded-lg",
											impostorIds.includes(id)
												? "bg-destructive/70"
												: "bg-primary/50",
										)}
										initial={{ width: 0 }}
										animate={{
											width: `${(n / maxVotes) * 100}%`,
										}}
										transition={{
											delay: 1 + i * 0.1,
											duration: 0.6,
											ease: "easeOut",
										}}
									/>
									<span className="relative flex h-full items-center justify-between px-3 text-sm font-medium">
										{nameOf(id)}
										<span className="tabular-nums">
											{n}
										</span>
									</span>
								</div>
							</div>
						))}
				</div>
			)}
		</div>
	);
}
