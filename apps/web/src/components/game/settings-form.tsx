"use client";

import { maxImpostors, type Settings } from "@impostor/game";
import {
	CheckIcon,
	LayersIcon,
	LightbulbIcon,
	MinusIcon,
	PlusIcon,
	SkullIcon,
	SparklesIcon,
	SwordsIcon,
	VoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { PackSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export const LOCAL_PACK_ID = "local";

interface Props {
	settings: Settings;
	onChange: (patch: Partial<Settings>) => void;
	mode: "local" | "online";
	playerCount: number;
	packs: PackSummary[] | null;
	/** null while words are loading */
	categories: string[] | null;
	localWordCount?: number;
	readOnly?: boolean;
}

interface ToggleProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}

function Toggle({
	icon,
	label,
	description,
	checked,
	onChange,
	disabled,
}: ToggleProps) {
	return (
		<label
			className={cn(
				"flex items-center gap-3 px-4 py-3",
				!disabled && "cursor-pointer",
			)}
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
				{icon}
			</span>
			<span className="flex flex-1 flex-col">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-xs text-muted-foreground">
					{description}
				</span>
			</span>
			<Switch
				checked={checked}
				onCheckedChange={(v) => onChange(v)}
				disabled={disabled}
			/>
		</label>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
			{children}
		</span>
	);
}

export function SettingsForm({
	settings,
	onChange,
	mode,
	playerCount,
	packs,
	categories,
	localWordCount = 0,
	readOnly,
}: Props) {
	const max = maxImpostors(Math.max(playerCount, 3));
	const count = Math.min(settings.impostorCount, max);

	function togglePack(id: string) {
		const on = settings.packIds.includes(id);
		onChange({
			packIds: on
				? settings.packIds.filter((p) => p !== id)
				: [...settings.packIds, id],
			categories: [],
		});
	}

	function toggleCategory(category: string) {
		const on = settings.categories.includes(category);
		onChange({
			categories: on
				? settings.categories.filter((c) => c !== category)
				: [...settings.categories, category],
		});
	}

	const packOptions = [
		...(packs ?? []),
		...(mode === "local" && localWordCount
			? [
					{
						id: LOCAL_PACK_ID,
						name: "Moje słowa (to urządzenie)",
						wordCount: localWordCount,
					} as PackSummary,
				]
			: []),
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
				<span className="flex items-center gap-3">
					<span className="flex size-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
						<SkullIcon className="size-4" />
					</span>
					<span className="text-sm font-medium">Impostorzy</span>
				</span>
				<div className="flex items-center gap-3">
					<Button
						size="icon-sm"
						variant="outline"
						disabled={readOnly || count <= 1}
						onClick={() => onChange({ impostorCount: count - 1 })}
						aria-label="Mniej"
					>
						<MinusIcon />
					</Button>
					<span className="w-6 text-center font-heading text-2xl font-extrabold tabular-nums">
						{count}
					</span>
					<Button
						size="icon-sm"
						variant="outline"
						disabled={readOnly || count >= max}
						onClick={() => onChange({ impostorCount: count + 1 })}
						aria-label="Więcej"
					>
						<PlusIcon />
					</Button>
				</div>
			</div>

			<div className="flex flex-col divide-y rounded-xl border bg-muted/30">
				<Toggle
					icon={<LightbulbIcon className="size-4" />}
					label="Podpowiedź dla impostora"
					description="Dostaje jedno luźne skojarzenie z hasłem"
					checked={settings.impostorHint}
					onChange={(v) => onChange({ impostorHint: v })}
					disabled={readOnly}
				/>
				<Toggle
					icon={<LayersIcon className="size-4" />}
					label="Pokazuj kategorię"
					description="Kategoria hasła widoczna na kartach graczy"
					checked={settings.showCategory}
					onChange={(v) => onChange({ showCategory: v })}
					disabled={readOnly}
				/>
				<Toggle
					icon={<SwordsIcon className="size-4" />}
					label="Impostor może zaczynać"
					description="Inaczej pierwszy zawsze mówi ktoś, kto zna hasło"
					checked={settings.impostorCanStart}
					onChange={(v) => onChange({ impostorCanStart: v })}
					disabled={readOnly}
				/>
				<Toggle
					icon={<SparklesIcon className="size-4" />}
					label="Ostatnia szansa"
					description="Na koniec impostor może zgadnąć hasło za punkt"
					checked={settings.impostorGuess}
					onChange={(v) => onChange({ impostorGuess: v })}
					disabled={readOnly}
				/>
				{mode === "online" && (
					<Toggle
						icon={<VoteIcon className="size-4" />}
						label="Głosowanie"
						description="Każdy wskazuje podejrzanego na swoim urządzeniu"
						checked={settings.voting}
						onChange={(v) => onChange({ voting: v })}
						disabled={readOnly}
					/>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<SectionLabel>Paczki słów</SectionLabel>
				{packs === null ? (
					<div className="grid gap-2 sm:grid-cols-2">
						<Skeleton className="h-14 rounded-xl" />
						<Skeleton className="h-14 rounded-xl" />
					</div>
				) : !packOptions.length ? (
					<p className="text-sm text-muted-foreground">
						Brak połączenia z serwerem, gra użyje wbudowanej listy.
					</p>
				) : (
					<div className="grid gap-2 sm:grid-cols-2">
						{packOptions.map((p) => {
							const on = settings.packIds.includes(p.id);
							return (
								<button
									key={p.id}
									type="button"
									disabled={readOnly}
									onClick={() => togglePack(p.id)}
									className={cn(
										"flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all enabled:hover:border-primary/50 enabled:active:scale-[0.98]",
										on
											? "border-primary/60 bg-primary/10"
											: "bg-muted/30",
									)}
								>
									<span
										className={cn(
											"flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
											on &&
												"border-primary bg-primary text-primary-foreground",
										)}
									>
										{on && (
											<CheckIcon className="size-3.5" />
										)}
									</span>
									<span className="flex min-w-0 flex-col">
										<span className="truncate text-sm font-medium">
											{p.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{p.visibility === "OFFICIAL"
												? "oficjalna"
												: "własna"}
											{p.wordCount > 0 &&
												` · ${p.wordCount} słów`}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				)}
				{packs !== null &&
					packOptions.length > 0 &&
					!settings.packIds.length && (
						<p className="text-xs text-muted-foreground">
							Nic nie zaznaczone = paczki oficjalne
						</p>
					)}
			</div>

			{categories === null ? (
				<Skeleton className="h-16 rounded-xl" />
			) : (
				categories.length > 1 && (
					<div className="flex flex-col gap-2">
						<SectionLabel>
							Kategorie{" "}
							{settings.categories.length
								? `(${settings.categories.length})`
								: "(wszystkie)"}
						</SectionLabel>
						<div className="flex flex-wrap gap-1.5">
							{categories.map((c) => {
								const on = settings.categories.includes(c);
								return (
									<button
										key={c}
										type="button"
										disabled={readOnly}
										onClick={() => toggleCategory(c)}
										className={cn(
											"rounded-full border px-3 py-1 text-sm transition-all enabled:active:scale-95",
											on
												? "border-primary bg-primary text-primary-foreground"
												: "bg-muted/30 text-muted-foreground enabled:hover:text-foreground",
										)}
									>
										{c}
									</button>
								);
							})}
						</div>
					</div>
				)
			)}
		</div>
	);
}
