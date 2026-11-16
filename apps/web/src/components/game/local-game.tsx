"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import {
	cardFor,
	categoriesOf,
	createGame,
	GameError,
	MAX_NAME_LENGTH,
	MAX_PLAYERS,
	MIN_PLAYERS,
	reduce,
	wordHidden,
	type Action,
	type Card,
	type GameState,
	type Player,
	type Settings,
} from "@impostor/game";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowRightIcon,
	PlayIcon,
	RotateCcwIcon,
	SettingsIcon,
	UserPlusIcon,
	UsersIcon,
	XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card as UiCard,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePacks } from "@/hooks/use-packs";
import { useWords } from "@/hooks/use-words";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { OrderList } from "./order-list";
import { PhaseTransition } from "./phase-transition";
import { PlayerAvatar } from "./player-avatar";
import { ResultView } from "./result-view";
import { RoleCard } from "./role-card";
import { LOCAL_PACK_ID, SettingsForm } from "./settings-form";

export function LocalGame() {
	use(browser("Gracze i ustawienia są w localStorage"));

	const [names, setNames] = useState(storage.players);
	const [settings, setSettings] = useState<Settings>(() => ({
		...storage.settings(),
		voting: false,
	}));
	const [game, setGame] = useState<GameState | null>(storage.localGame);
	const [localWords] = useState(storage.localWords);
	const { packs } = usePacks();

	const hasLocal =
		settings.packIds.includes(LOCAL_PACK_ID) && localWords.length > 0;
	const serverIds = settings.packIds.filter((id) => id !== LOCAL_PACK_ID);
	const useServer = serverIds.length > 0 || !hasLocal;
	const { words: fetched, offline } = useWords(serverIds);
	const words = [
		...(useServer ? (fetched ?? []) : []),
		...(hasLocal ? localWords : []),
	];
	const wordsReady = !useServer || fetched !== null;

	function save(next: GameState | null) {
		setGame(next);
		storage.setLocalGame(next);
	}

	function dispatch(action: Action) {
		try {
			save(reduce(game!, action));
		} catch (err) {
			toast.error(
				err instanceof GameError ? err.message : "Coś poszło nie tak",
			);
		}
	}

	function updateNames(next: string[]) {
		setNames(next);
		storage.setPlayers(next);
	}

	function updateSettings(patch: Partial<Settings>) {
		const next = { ...settings, ...patch };
		setSettings(next);
		storage.setSettings(next);
	}

	function start() {
		const players = names.map((name) => ({ id: name, name }));
		const base = game ?? createGame();
		try {
			save(
				reduce(
					{ ...base, players, settings, scores: {} },
					{ type: "start", words },
				),
			);
		} catch (err) {
			toast.error(
				err instanceof GameError ? err.message : "Coś poszło nie tak",
			);
		}
	}

	const phase = game?.phase ?? "LOBBY";

	return (
		<PhaseTransition id={phase}>
			{!game || phase === "LOBBY" ? (
				<Setup
					names={names}
					onNames={updateNames}
					settings={settings}
					onSettings={updateSettings}
					packs={offline ? [] : packs}
					categories={wordsReady ? categoriesOf(words) : null}
					localWordCount={localWords.length}
					canStart={names.length >= MIN_PLAYERS && words.length > 0}
					onStart={start}
				/>
			) : phase === "REVEAL" ? (
				<Deck
					game={game}
					onNext={(playerId) => dispatch({ type: "ready", playerId })}
					onAbort={() => dispatch({ type: "lobby" })}
				/>
			) : phase === "PLAYING" ? (
				<div className="flex flex-col items-center gap-8">
					<OrderList order={game.round!.order} nameOf={(id) => id} />
					<Button
						size="xl"
						className="bg-destructive text-white shadow-[0_8px_30px_-10px_var(--destructive)] hover:bg-destructive/85"
						onClick={() => dispatch({ type: "reveal" })}
					>
						Pokaż impostora
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => dispatch({ type: "lobby" })}
					>
						Przerwij rundę
					</Button>
				</div>
			) : (
				<Result game={game} dispatch={dispatch} onNextRound={start} />
			)}
		</PhaseTransition>
	);
}

function Result({
	game,
	dispatch,
	onNextRound,
}: {
	game: GameState;
	dispatch: (a: Action) => void;
	onNextRound: () => void;
}) {
	const round = game.round!;
	const hidden = wordHidden(game);
	return (
		<div className="flex flex-col items-center gap-10">
			<ResultView
				word={hidden ? null : round.word}
				category={round.category}
				impostorIds={round.impostorIds}
				nameOf={(id) => id}
				guess={round.guess}
				onGuess={
					hidden
						? (text) =>
								dispatch({
									type: "guess",
									playerId: round.impostorIds[0],
									text,
								})
						: undefined
				}
				onSkip={
					hidden ? () => dispatch({ type: "skipGuess" }) : undefined
				}
			/>
			<AnimatePresence>
				{!hidden && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="flex flex-wrap justify-center gap-3"
					>
						<Button size="xl" onClick={onNextRound}>
							<RotateCcwIcon /> Następna runda
						</Button>
						<Button
							size="xl"
							variant="outline"
							onClick={() => dispatch({ type: "lobby" })}
						>
							<SettingsIcon /> Ustawienia
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

const CARD_SIZE = "w-[min(78vw,300px)] aspect-[5/7]";

function Deck({
	game,
	onNext,
	onAbort,
}: {
	game: GameState;
	onNext: (playerId: string) => void;
	onAbort: () => void;
}) {
	const round = game.round!;
	const index = round.ready.length;
	const current: Player = game.players[index];
	const [seenIndex, setSeenIndex] = useState(-1);
	const seen = seenIndex === index;
	const remaining = game.players.length - index - 1;
	const last = remaining === 0;

	return (
		<div className="flex flex-col items-center gap-6 overflow-x-clip">
			<div className="flex items-center gap-1.5">
				{game.players.map((p, i) => (
					<motion.span
						key={p.id}
						layout
						className={cn(
							"h-1.5 rounded-full",
							i < index
								? "w-4 bg-primary"
								: i === index
									? "w-8 bg-primary"
									: "w-4 bg-muted",
						)}
					/>
				))}
			</div>

			<div className="relative grid place-items-center">
				{[2, 1].map(
					(depth) =>
						remaining >= depth && (
							<div
								key={depth}
								aria-hidden
								className={cn(
									CARD_SIZE,
									"card-pattern absolute rounded-3xl border border-primary/20 bg-card",
								)}
								style={{
									transform: `translateY(${depth * 10}px) rotate(${depth % 2 ? 4 : -4}deg) scale(${1 - depth * 0.04})`,
									opacity: 1 - depth * 0.3,
								}}
							/>
						),
				)}
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.div
						key={current.id}
						initial={{ y: 24, scale: 0.92, opacity: 0 }}
						animate={{ y: 0, scale: 1, opacity: 1 }}
						exit={{
							x: -420,
							rotate: -18,
							opacity: 0,
							transition: { duration: 0.35, ease: "easeIn" },
						}}
						className="relative"
					>
						<RoleCard
							card={cardFor(game, current.id) as Card}
							playerName={current.name}
							onSeen={() => setSeenIndex(index)}
						/>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className="flex h-20 flex-col items-center gap-2">
				<Button
					size="xl"
					disabled={!seen}
					onClick={() => onNext(current.id)}
					className="min-w-56"
				>
					{last ? (
						<>
							<PlayIcon /> Zaczynamy
						</>
					) : (
						<>
							Następny gracz <ArrowRightIcon />
						</>
					)}
				</Button>
				<p className="text-xs text-muted-foreground">
					{seen
						? "Schowaj kartę i podaj dalej"
						: `Tylko ${current.name} patrzy na kartę`}
				</p>
			</div>

			<Button variant="ghost" size="sm" onClick={onAbort}>
				Przerwij rundę
			</Button>
		</div>
	);
}

interface SetupProps {
	names: string[];
	onNames: (names: string[]) => void;
	settings: Settings;
	onSettings: (patch: Partial<Settings>) => void;
	packs: ReturnType<typeof usePacks>["packs"];
	categories: string[] | null;
	localWordCount: number;
	canStart: boolean;
	onStart: () => void;
}

function Setup({
	names,
	onNames,
	settings,
	onSettings,
	packs,
	categories,
	localWordCount,
	canStart,
	onStart,
}: SetupProps) {
	const [draft, setDraft] = useState("");

	function add() {
		const name = draft
			.trim()
			.replace(/\s+/g, " ")
			.slice(0, MAX_NAME_LENGTH);
		if (!name) return;
		if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
			toast.error("Taki gracz już jest");
			return;
		}
		onNames([...names, name]);
		setDraft("");
	}

	const missing = MIN_PLAYERS - names.length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-4xl font-extrabold tracking-tight">
					Gra lokalna
				</h1>
				<p className="text-muted-foreground">
					Jedno urządzenie, podawane z rąk do rąk.
				</p>
			</div>

			<div className="grid items-start gap-6 md:grid-cols-2">
				<UiCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UsersIcon className="size-5 text-primary" /> Gracze
							<span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
								{names.length}/{MAX_PLAYERS}
							</span>
						</CardTitle>
						<CardDescription>
							W tej kolejności będziecie oglądać karty.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<form
							className="flex gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								add();
							}}
						>
							<Input
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								placeholder="Imię gracza"
								maxLength={MAX_NAME_LENGTH}
								disabled={names.length >= MAX_PLAYERS}
								className="h-11 rounded-xl"
							/>
							<Button
								type="submit"
								variant="secondary"
								className="h-11 rounded-xl px-4"
								aria-label="Dodaj gracza"
							>
								<UserPlusIcon />
							</Button>
						</form>
						<ul className="flex flex-col">
							<AnimatePresence initial={false}>
								{names.map((name, i) => (
									<motion.li
										key={name}
										layout
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="overflow-hidden"
									>
										<div className="mb-1.5 flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
											<span className="w-4 text-right text-sm text-muted-foreground tabular-nums">
												{i + 1}
											</span>
											<PlayerAvatar name={name} />
											<span className="flex-1 font-medium">
												{name}
											</span>
											<Button
												size="icon-xs"
												variant="ghost"
												onClick={() =>
													onNames(
														names.filter(
															(n) => n !== name,
														),
													)
												}
												aria-label={`Usuń ${name}`}
											>
												<XIcon />
											</Button>
										</div>
									</motion.li>
								))}
							</AnimatePresence>
						</ul>
						{missing > 0 && (
							<p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
								Dodaj jeszcze {missing}{" "}
								{missing === 1 ? "gracza" : "graczy"}
							</p>
						)}
					</CardContent>
				</UiCard>

				<UiCard>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<SettingsIcon className="size-5 text-primary" />{" "}
							Ustawienia
						</CardTitle>
					</CardHeader>
					<CardContent>
						<SettingsForm
							settings={settings}
							onChange={onSettings}
							mode="local"
							playerCount={names.length}
							packs={packs}
							categories={categories}
							localWordCount={localWordCount}
						/>
					</CardContent>
				</UiCard>
			</div>

			<div className="sticky bottom-0 z-10 -mx-4 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pt-10 pb-4">
				<Button
					size="xl"
					className="h-14 w-full text-lg"
					disabled={!canStart}
					onClick={onStart}
				>
					<PlayIcon /> Rozdaj karty
				</Button>
			</div>
		</div>
	);
}
