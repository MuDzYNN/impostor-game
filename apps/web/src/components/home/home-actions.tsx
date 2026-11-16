"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "@impostor/game";
import { motion } from "motion/react";
import { ArrowRightIcon, GlobeIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";
import { getSocket } from "@/lib/socket";
import { sessionToken, storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

function Tile({
	icon,
	title,
	description,
	children,
	delay,
	className,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
	delay: number;
	className?: string;
}) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay }}
			className={cn(
				"group relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border bg-card/70 p-6 backdrop-blur sm:p-8",
				className,
			)}
		>
			<div className="flex flex-col gap-3">
				<span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-transform group-hover:scale-110 group-hover:-rotate-6">
					{icon}
				</span>
				<h2 className="text-2xl font-extrabold tracking-tight">
					{title}
				</h2>
				<p className="text-muted-foreground">{description}</p>
			</div>
			<div className="mt-auto flex flex-col gap-3">{children}</div>
		</motion.section>
	);
}

export function HomeActions() {
	use(browser("Nick jest w localStorage"));

	const router = useRouter();
	const { me } = useMe();
	const [nick, setNick] = useState(() => storage.nick());
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const name = nick.trim() || me?.name || "";

	function create() {
		if (!name) return toast.error("Podaj nick");
		setBusy(true);
		getSocket().emit(
			"room:create",
			{ name, token: sessionToken() },
			(res) => {
				setBusy(false);
				if (!res.ok) return toast.error(res.error);
				storage.setNick(name);
				router.push(`/room/${res.code}`);
			},
		);
	}

	function join(e: React.FormEvent) {
		e.preventDefault();
		if (!name) return toast.error("Podaj nick");
		storage.setNick(name);
		router.push(`/room/${code.trim().toUpperCase()}`);
	}

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<Tile
				icon={<SmartphoneIcon className="size-6" />}
				title="Jedno urządzenie"
				description="Siedzicie razem i podajecie sobie telefon, tablet czy laptopa. Każdy po kolei odkrywa swoją kartę."
				delay={0.1}
			>
				<div aria-hidden className="relative mx-auto mb-2 h-36 w-full">
					{[-14, 0, 14].map((r, i) => (
						<div
							key={r}
							className={cn(
								"card-pattern absolute top-2 left-1/2 h-32 w-24 rounded-2xl border border-primary/30 bg-card shadow-xl transition-transform duration-500",
								i === 1 && "z-10",
							)}
							style={{
								transform: `translateX(calc(-50% + ${r * 3}px)) rotate(${r}deg)`,
							}}
						>
							{i === 1 && (
								<span className="flex h-full items-center justify-center font-heading text-4xl font-extrabold text-primary">
									?
								</span>
							)}
						</div>
					))}
				</div>
				<Button
					size="xl"
					className="w-full"
					nativeButton={false}
					render={<Link href="/local" />}
				>
					Graj lokalnie <ArrowRightIcon />
				</Button>
			</Tile>

			<Tile
				icon={<GlobeIcon className="size-6" />}
				title="Każdy u siebie"
				description="Pokój online z kodem. Gadacie przy stole albo na Discordzie, a karty i głosy macie na swoich urządzeniach."
				delay={0.2}
			>
				<Input
					value={nick}
					onChange={(e) => setNick(e.target.value)}
					placeholder={me?.name ? `Nick (${me.name})` : "Twój nick"}
					maxLength={MAX_NAME_LENGTH}
					aria-label="Twój nick"
					className="h-12 rounded-xl text-base"
				/>
				<Button
					size="xl"
					className="w-full"
					disabled={busy}
					onClick={create}
				>
					Stwórz pokój
				</Button>
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<span className="h-px flex-1 bg-border" /> albo dołącz{" "}
					<span className="h-px flex-1 bg-border" />
				</div>
				<form className="flex gap-2" onSubmit={join}>
					<Input
						value={code}
						onChange={(e) => setCode(e.target.value.toUpperCase())}
						placeholder="KOD"
						maxLength={ROOM_CODE_LENGTH}
						aria-label="Kod pokoju"
						className="h-12 rounded-xl text-center font-mono text-lg tracking-[0.4em] uppercase"
					/>
					<Button
						type="submit"
						size="xl"
						variant="secondary"
						disabled={code.trim().length !== ROOM_CODE_LENGTH}
					>
						Dołącz
					</Button>
				</form>
			</Tile>
		</div>
	);
}
