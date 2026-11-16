"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	categoriesOf,
	MAX_NAME_LENGTH,
	MIN_PLAYERS,
	type Ack,
	type ClientEvents,
	type MemberView,
	type RoomView,
	type Settings,
} from "@impostor/game";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowRightIcon,
	CheckIcon,
	CopyIcon,
	CrownIcon,
	DoorClosedIcon,
	EyeIcon,
	LogOutIcon,
	PlayIcon,
	RotateCcwIcon,
	SettingsIcon,
	TrophyIcon,
	UsersIcon,
	UserXIcon,
	VoteIcon,
	WifiOffIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Spinner } from "@/components/page-fallback";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";
import { usePacks } from "@/hooks/use-packs";
import { useWords } from "@/hooks/use-words";
import { getSocket } from "@/lib/socket";
import { sessionToken, storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { OrderList } from "./order-list";
import { PhaseTransition } from "./phase-transition";
import { PlayerAvatar } from "./player-avatar";
import { ResultView } from "./result-view";
import { RoleCard } from "./role-card";
import { SettingsForm } from "./settings-form";

type NoDataEvent =
	| "game:start"
	| "game:ready"
	| "game:voting"
	| "game:reveal"
	| "game:skipGuess"
	| "game:lobby"
	| "room:leave";

function call(event: NoDataEvent): Promise<Ack>;
function call<E extends keyof ClientEvents>(
	event: E,
	data: Parameters<ClientEvents[E]>[0],
): Promise<Ack>;
function call(event: string, data?: unknown): Promise<Ack> {
	const socket = getSocket() as unknown as {
		emit: (...args: unknown[]) => void;
	};
	return new Promise((resolve) => {
		const done = (res: Ack) => {
			if (!res.ok) toast.error(res.error);
			resolve(res);
		};
		if (data === undefined) socket.emit(event, done);
		else socket.emit(event, data, done);
	});
}

export function OnlineRoom({ code }: { code: string }) {
	use(browser("Token sesji jest w localStorage"));

	const router = useRouter();
	const { me, loading } = useMe();
	const [view, setView] = useState<RoomView | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [needsNick, setNeedsNick] = useState(false);
	const autoName = storage.nick() || me?.name || "";
	const nameRef = useRef<string | null>(null);

	const join = useCallback(
		(name: string) => {
			nameRef.current = name;
			getSocket().emit(
				"room:join",
				{ code, name, token: sessionToken() },
				(res) => {
					if (res.ok) {
						storage.setNick(name);
						setNeedsNick(false);
						setError(null);
					} else if (
						res.error === "Ten nick jest już zajęty" ||
						res.error === "Podaj nick"
					) {
						toast.error(res.error);
						setNeedsNick(true);
					} else {
						setError(res.error);
					}
				},
			);
		},
		[code],
	);

	useEffect(() => {
		if (loading) return;
		const socket = getSocket();
		const onState = (v: RoomView) => setView(v);
		const onKicked = () => {
			toast.error("Wyrzucono cię z pokoju");
			router.push("/");
		};
		// Rejoin with the same token after a dropped connection
		const onConnect = () => nameRef.current && join(nameRef.current);
		socket.on("room:state", onState);
		socket.on("room:kicked", onKicked);
		socket.on("connect", onConnect);

		if (autoName) join(autoName);

		return () => {
			socket.off("room:state", onState);
			socket.off("room:kicked", onKicked);
			socket.off("connect", onConnect);
		};
	}, [loading, autoName, join, router]);

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border bg-card/70 p-8 text-center"
			>
				<span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
					<DoorClosedIcon className="size-7" />
				</span>
				<h1 className="text-2xl font-extrabold">
					Nie udało się dołączyć
				</h1>
				<p className="text-muted-foreground">{error}</p>
				<Button
					size="xl"
					nativeButton={false}
					render={<Link href="/" />}
				>
					Wróć na start
				</Button>
			</motion.div>
		);
	}

	if (needsNick || (!loading && !autoName && !view))
		return <NickForm code={code} initial={autoName} onSubmit={join} />;
	if (!view) return <Spinner label={`Łączenie z pokojem ${code}…`} />;

	async function leave() {
		await call("room:leave");
		router.push("/");
	}

	return (
		<div className="flex w-full flex-col gap-8">
			<div className="flex items-center justify-between gap-2">
				<button
					type="button"
					className="group flex flex-col items-start"
					onClick={() => {
						void navigator.clipboard.writeText(
							`${window.location.origin}/room/${view.code}`,
						);
						toast.success("Skopiowano link do pokoju");
					}}
				>
					<span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Pokój
					</span>
					<span className="flex items-center gap-2 font-mono text-3xl font-bold tracking-[0.25em]">
						{view.code}
						<CopyIcon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
					</span>
				</button>
				<div className="flex items-center gap-2">
					{view.phase !== "LOBBY" && (
						<span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
							Runda {view.roundNo}
						</span>
					)}
					<Button variant="ghost" size="sm" onClick={leave}>
						<LogOutIcon /> Wyjdź
					</Button>
				</div>
			</div>
			<PhaseTransition id={view.phase}>
				<Phase view={view} />
			</PhaseTransition>
		</div>
	);
}

function NickForm({
	code,
	initial,
	onSubmit,
}: {
	code: string;
	initial: string;
	onSubmit: (name: string) => void;
}) {
	const [name, setName] = useState(initial);
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-3xl border bg-card/70 p-8 backdrop-blur"
		>
			<div className="flex flex-col gap-1 text-center">
				<span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
					Dołączasz do pokoju
				</span>
				<span className="font-mono text-4xl font-bold tracking-[0.25em]">
					{code}
				</span>
			</div>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					if (name.trim()) onSubmit(name.trim());
				}}
			>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Twój nick"
					maxLength={MAX_NAME_LENGTH}
					autoFocus
					className="h-12 rounded-xl text-center text-lg"
				/>
				<Button type="submit" size="xl">
					Wchodzę <ArrowRightIcon />
				</Button>
			</form>
		</motion.div>
	);
}

function Phase({ view }: { view: RoomView }) {
	const me = view.members.find((m) => m.id === view.meId)!;
	const isHost = view.hostId === view.meId;
	const players = view.members.filter((m) => !m.spectator);
	const nameOf = (id: string) =>
		view.members.find((m) => m.id === id)?.name ?? "?";
	const round = view.round;

	if (view.phase === "LOBBY") return <Lobby view={view} isHost={isHost} />;

	if (me.spectator) {
		return (
			<div className="flex flex-col items-center gap-6 text-center">
				<span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
					<EyeIcon className="size-7" />
				</span>
				<h2 className="text-2xl font-extrabold">Runda trwa</h2>
				<p className="text-muted-foreground">
					Dołączysz automatycznie od następnej.
				</p>
				<Members view={view} isHost={isHost} />
			</div>
		);
	}

	if (view.phase === "REVEAL") {
		const ready = round!.readyIds.includes(view.meId);
		return (
			<div className="flex flex-col items-center gap-6">
				{view.card && (
					<RoleCard card={view.card} playerName={me.name} />
				)}
				<Button
					size="xl"
					className="min-w-56"
					disabled={ready}
					onClick={() => call("game:ready")}
				>
					{ready ? (
						<>
							<CheckIcon /> Gotowe
						</>
					) : (
						"Zgłoś gotowość"
					)}
				</Button>
				<WaitingFor
					players={players}
					doneIds={round!.readyIds}
					label="gotowych"
				/>
			</div>
		);
	}

	if (view.phase === "PLAYING") {
		return (
			<div className="flex flex-col items-center gap-10">
				<OrderList order={round!.order} nameOf={nameOf} />
				{view.card && (
					<div className="flex flex-col items-center gap-2">
						<span className="text-xs text-muted-foreground">
							Zapomniałeś? Przytrzymaj kartę
						</span>
						<RoleCard
							card={view.card}
							playerName={me.name}
							className="w-50"
						/>
					</div>
				)}
				{isHost && (
					<div>
						<Button
							size="xl"
							className="min-w-64"
							onClick={() =>
								call(
									view.settings.voting
										? "game:voting"
										: "game:reveal",
								)
							}
						>
							{view.settings.voting ? (
								<>
									<VoteIcon /> Głosowanie
								</>
							) : (
								"Pokaż impostora"
							)}
						</Button>
					</div>
				)}
			</div>
		);
	}

	if (view.phase === "VOTING") return <Voting view={view} isHost={isHost} />;

	const result = round!.result!;
	const isImpostor = result.impostorIds.includes(view.meId);
	const hidden = result.word === null;
	return (
		<div className="flex flex-col items-center gap-10">
			<ResultView
				word={result.word}
				category={result.category}
				impostorIds={result.impostorIds}
				nameOf={nameOf}
				outcome={result.outcome}
				guess={result.guess}
				onGuess={
					hidden && isImpostor
						? (text) => call("game:guess", { text })
						: undefined
				}
				onSkip={
					hidden && (isImpostor || isHost)
						? () => call("game:skipGuess")
						: undefined
				}
			/>
			<Scoreboard members={players} />
			{!hidden &&
				(isHost ? (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="flex flex-wrap justify-center gap-3"
					>
						<Button size="xl" onClick={() => call("game:start")}>
							<RotateCcwIcon /> Następna runda
						</Button>
						<Button
							size="xl"
							variant="outline"
							onClick={() => call("game:lobby")}
						>
							<SettingsIcon /> Lobby
						</Button>
					</motion.div>
				) : (
					<p className="text-sm text-muted-foreground">
						Host zaraz rozda kolejne karty…
					</p>
				))}
		</div>
	);
}

function WaitingFor({
	players,
	doneIds,
	label,
}: {
	players: MemberView[];
	doneIds: string[];
	label: string;
}) {
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="flex -space-x-2">
				{players.map((m) => (
					<motion.span
						key={m.id}
						animate={{
							opacity: doneIds.includes(m.id) ? 1 : 0.3,
							scale: doneIds.includes(m.id) ? 1 : 0.9,
						}}
						title={m.name}
					>
						<PlayerAvatar
							name={m.name}
							className="ring-2 ring-background"
						/>
					</motion.span>
				))}
			</div>
			<span className="text-sm text-muted-foreground tabular-nums">
				{doneIds.length}/{players.length} {label}
			</span>
		</div>
	);
}

function Voting({ view, isHost }: { view: RoomView; isHost: boolean }) {
	const round = view.round!;
	const voted = round.votedIds.includes(view.meId);
	const players = view.members.filter((m) => !m.spectator);
	const [picked, setPicked] = useState<string | null>(null);

	async function vote(targetId: string | null) {
		setPicked(targetId ?? "");
		const res = await call("game:vote", { targetId });
		if (!res.ok) setPicked(null);
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex flex-col items-center gap-1 text-center">
				<h2 className="text-3xl font-extrabold tracking-tight">
					{voted ? "Głos oddany" : "Kto jest impostorem?"}
				</h2>
				<p className="text-muted-foreground">
					{voted ? "Czekamy na resztę…" : "Wskaż jedną osobę"}
				</p>
			</div>
			<div className="grid w-full max-w-md grid-cols-2 gap-3">
				{players
					.filter((m) => m.id !== view.meId)
					.map((m, i) => (
						<motion.button
							key={m.id}
							type="button"
							initial={{ opacity: 0, y: 12 }}
							animate={{
								opacity: voted && picked !== m.id ? 0.4 : 1,
								y: 0,
							}}
							transition={{ delay: i * 0.05 }}
							whileTap={{ scale: 0.95 }}
							disabled={voted}
							onClick={() => vote(m.id)}
							className={cn(
								"flex flex-col items-center gap-2 rounded-2xl border bg-card/70 p-4 transition-colors enabled:hover:border-primary/60 enabled:hover:bg-primary/10",
								picked === m.id &&
									"border-primary bg-primary/15 glow-primary",
							)}
						>
							<PlayerAvatar
								name={m.name}
								className="size-14 text-xl"
							/>
							<span className="font-semibold">{m.name}</span>
						</motion.button>
					))}
			</div>
			{!voted && (
				<Button variant="ghost" onClick={() => vote(null)}>
					Wstrzymuję się
				</Button>
			)}
			<WaitingFor
				players={players}
				doneIds={round.votedIds}
				label="zagłosowało"
			/>
			{isHost && (
				<Button variant="outline" onClick={() => call("game:reveal")}>
					Zakończ głosowanie
				</Button>
			)}
		</div>
	);
}

function Scoreboard({ members }: { members: MemberView[] }) {
	const sorted = [...members].sort((a, b) => b.score - a.score);
	return (
		<div className="flex w-full max-w-sm flex-col gap-2">
			<span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				<TrophyIcon className="size-4" /> Ranking
			</span>
			<ol className="flex flex-col gap-1.5">
				{sorted.map((m, i) => (
					<motion.li
						key={m.id}
						layout
						className={cn(
							"flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2",
							i === 0 &&
								m.score > 0 &&
								"border-amber-400/40 bg-amber-400/10",
						)}
					>
						<span className="w-4 text-right font-heading font-bold text-muted-foreground tabular-nums">
							{i + 1}
						</span>
						<PlayerAvatar
							name={m.name}
							className="size-7 text-xs"
						/>
						<span className="flex-1 font-medium">{m.name}</span>
						<span className="font-heading text-lg font-extrabold tabular-nums">
							{m.score}
						</span>
					</motion.li>
				))}
			</ol>
		</div>
	);
}

function Members({ view, isHost }: { view: RoomView; isHost: boolean }) {
	return (
		<ul className="flex w-full flex-col">
			<AnimatePresence initial={false}>
				{view.members.map((m) => (
					<motion.li
						key={m.id}
						layout
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden"
					>
						<div
							className={cn(
								"mb-1.5 flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2 transition-opacity",
								!m.connected && "opacity-50",
							)}
						>
							<PlayerAvatar name={m.name} />
							<span className="flex flex-1 items-center gap-2 font-medium">
								{m.name}
								{m.id === view.meId && (
									<span className="text-xs text-muted-foreground">
										(ty)
									</span>
								)}
								{m.id === view.hostId && (
									<CrownIcon className="size-4 text-amber-400" />
								)}
								{m.spectator && (
									<span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
										widz
									</span>
								)}
								{!m.connected && (
									<WifiOffIcon className="size-4 text-muted-foreground" />
								)}
							</span>
							{isHost && m.id !== view.meId && (
								<Button
									size="icon-xs"
									variant="ghost"
									aria-label={`Wyrzuć ${m.name}`}
									onClick={() =>
										call("room:kick", { playerId: m.id })
									}
								>
									<UserXIcon />
								</Button>
							)}
						</div>
					</motion.li>
				))}
			</AnimatePresence>
		</ul>
	);
}

function Lobby({ view, isHost }: { view: RoomView; isHost: boolean }) {
	const { packs } = usePacks();
	const { words } = useWords(view.settings.packIds);
	const players = view.members.filter((m) => !m.spectator);
	const link = `${window.location.origin}/room/${view.code}`;

	function update(patch: Partial<Settings>) {
		void call("room:settings", patch);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid items-start gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UsersIcon className="size-5 text-primary" /> Gracze
							<span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
								{players.length}
							</span>
						</CardTitle>
						<CardDescription>
							Zeskanujcie kod albo wyślijcie link.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex gap-4 rounded-2xl border bg-muted/30 p-3">
							<div className="shrink-0 rounded-sm bg-white p-2 shadow-lg">
								<QRCodeSVG value={link} size={80} />
							</div>
							<div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
								<div className="flex flex-col gap-1.5">
									<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Kod zaproszenia
									</span>
									<div className="flex gap-1">
										{view.code.split("").map((ch, i) => (
											<span
												key={i}
												className="flex size-10 items-center justify-center rounded-md border bg-background/60 font-mono text-lg font-bold"
											>
												{ch}
											</span>
										))}
									</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="w-full"
									onClick={() => {
										void navigator.clipboard.writeText(
											link,
										);
										toast.success("Skopiowano link");
									}}
								>
									<CopyIcon /> Kopiuj link
								</Button>
							</div>
						</div>
						<Members view={view} isHost={isHost} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<SettingsIcon className="size-5 text-primary" />{" "}
							Ustawienia
						</CardTitle>
						{!isHost && (
							<CardDescription>
								Ustawienia zmienia host.
							</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						<SettingsForm
							settings={view.settings}
							onChange={update}
							mode="online"
							playerCount={players.length}
							packs={packs}
							categories={words ? categoriesOf(words) : null}
							readOnly={!isHost}
						/>
					</CardContent>
				</Card>
			</div>

			<div className="sticky bottom-4 z-10">
				{isHost ? (
					<Button
						size="xl"
						className="h-14 w-full text-lg"
						disabled={players.length < MIN_PLAYERS}
						onClick={() => call("game:start")}
					>
						{players.length < MIN_PLAYERS ? (
							`Czekamy na graczy (${players.length}/${MIN_PLAYERS})`
						) : (
							<>
								<PlayIcon /> Rozdaj karty
							</>
						)}
					</Button>
				) : (
					<div className="flex h-14 items-center justify-center gap-3 rounded-xl border bg-card/80 text-muted-foreground backdrop-blur">
						<span className="size-2 animate-pulse rounded-full bg-primary" />{" "}
						Czekamy, aż host rozda karty…
					</div>
				)}
			</div>
		</div>
	);
}
