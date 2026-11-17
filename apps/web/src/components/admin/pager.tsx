import { Button } from "@/components/ui/button";

export function Pager({
	page,
	pages,
	onPage,
}: {
	page: number;
	pages: number;
	onPage: (page: number) => void;
}) {
	if (pages <= 1) return null;
	return (
		<div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
			<Button
				variant="outline"
				size="sm"
				disabled={page <= 1}
				onClick={() => onPage(page - 1)}
			>
				Poprzednia
			</Button>
			Strona {page} z {pages}
			<Button
				variant="outline"
				size="sm"
				disabled={page >= pages}
				onClick={() => onPage(page + 1)}
			>
				Następna
			</Button>
		</div>
	);
}
