import { Skeleton } from "@/components/ui/skeleton";

export function CardsFallback() {
	return (
		<div className="grid w-full gap-6 md:grid-cols-2">
			<Skeleton className="h-[30rem] rounded-3xl" />
			<Skeleton className="h-[30rem] rounded-3xl" />
		</div>
	);
}

export function ListFallback() {
	return (
		<div className="flex w-full flex-col gap-3">
			<Skeleton className="h-10 w-56 rounded-xl" />
			<Skeleton className="h-20 rounded-2xl" />
			<Skeleton className="h-20 rounded-2xl" />
			<Skeleton className="h-64 rounded-2xl" />
		</div>
	);
}

export function Spinner({ label }: { label: string }) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
			<span className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
			{label}
		</div>
	);
}
