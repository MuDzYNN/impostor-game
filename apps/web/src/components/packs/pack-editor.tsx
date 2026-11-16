"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { api, type Pack, type PackInput, type Visibility } from "@/lib/api";
import { formatWordLines, parseWordLines } from "@/lib/words";

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
	{
		value: "PRIVATE",
		label: "Prywatna",
		hint: "Widzisz ją ty i każdy, komu dasz link.",
	},
	{
		value: "PUBLIC",
		label: "Publiczna",
		hint: "Po akceptacji moderatora widzą ją wszyscy.",
	},
	{
		value: "OFFICIAL",
		label: "Oficjalna",
		hint: "Domyślna paczka dla wszystkich graczy.",
	},
];

export function WordLinesField({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	const count = parseWordLines(value).length;
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor="words">Słowa ({count})</Label>
			<Textarea
				id="words"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				rows={12}
				className="font-mono text-sm"
				placeholder={
					"Pizza; Włochy; Jedzenie\nŻyrafa; Szyja; Zwierzęta"
				}
			/>
			<p className="text-xs text-muted-foreground">
				Jedno słowo w linii: hasło; podpowiedź dla impostora; kategoria.
			</p>
		</div>
	);
}

export function PackEditor({
	pack,
	onSaved,
}: {
	pack?: Pack;
	onSaved: (pack: Pack) => void;
}) {
	const { me } = useMe();
	const [name, setName] = useState(pack?.name ?? "");
	const [visibility, setVisibility] = useState<Visibility>(
		pack?.visibility ?? "PRIVATE",
	);
	const [lines, setLines] = useState(pack ? formatWordLines(pack.words) : "");
	const [busy, setBusy] = useState(false);

	async function save(e: React.FormEvent) {
		e.preventDefault();
		const body: PackInput = {
			name,
			visibility,
			words: parseWordLines(lines),
		};
		if (!body.words.length)
			return toast.error("Dodaj przynajmniej jedno słowo");
		setBusy(true);
		try {
			const saved = await api<Pack>(
				pack ? `/packs/${pack.id}` : "/packs",
				{ method: pack ? "PUT" : "POST", body: JSON.stringify(body) },
			);
			toast.success("Zapisano paczkę");
			onSaved(saved);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setBusy(false);
		}
	}

	const options = VISIBILITY.filter(
		(v) => v.value !== "OFFICIAL" || me?.isAdmin,
	);

	return (
		<form className="flex flex-col gap-5" onSubmit={save}>
			<div className="flex flex-col gap-2">
				<Label htmlFor="name">Nazwa</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					maxLength={60}
					required
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label>Widoczność</Label>
				<div className="flex flex-wrap gap-2">
					{options.map((v) => (
						<Button
							key={v.value}
							type="button"
							size="sm"
							variant={
								visibility === v.value ? "default" : "outline"
							}
							onClick={() => setVisibility(v.value)}
						>
							{v.label}
						</Button>
					))}
				</div>
				<p className="text-xs text-muted-foreground">
					{VISIBILITY.find((v) => v.value === visibility)?.hint}
				</p>
			</div>
			<WordLinesField value={lines} onChange={setLines} />
			<Button type="submit" disabled={busy}>
				Zapisz
			</Button>
		</form>
	);
}
