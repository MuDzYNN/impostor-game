import type { AdminStats } from "@/lib/api";

const shortDay = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}`;

export function GamesChart({ data }: { data: AdminStats["perDay"] }) {
	const max = Math.max(1, ...data.map((d) => d.games));

	return (
		<div className="flex flex-col gap-1">
			<div className="relative flex h-40 items-end gap-[2px] border-b border-border">
				<span className="absolute inset-x-0 top-0 border-t border-dashed border-border text-xs text-muted-foreground tabular-nums">
					{max}
				</span>
				{data.map((d) => (
					<div
						key={d.day}
						tabIndex={0}
						aria-label={`${shortDay(d.day)}: ${d.games}`}
						className="group relative flex h-full flex-1 items-end justify-center outline-none"
					>
						<div
							className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
							style={{ height: `${(d.games / max) * 100}%` }}
						/>
						<div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-visible:block">
							<strong className="tabular-nums">{d.games}</strong>{" "}
							<span className="text-muted-foreground">
								{shortDay(d.day)}
							</span>
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-between text-xs text-muted-foreground">
				<span>{shortDay(data[0].day)}</span>
				<span>{shortDay(data[data.length - 1].day)}</span>
			</div>
		</div>
	);
}
