export function Stat({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex flex-col rounded-lg border p-3">
			<span className="text-2xl font-black tabular-nums">{value}</span>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}
