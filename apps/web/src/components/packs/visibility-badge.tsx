import { Badge } from "@/components/ui/badge";
import type { PackSummary } from "@/lib/api";

export function VisibilityBadge({ pack }: { pack: PackSummary }) {
	if (pack.visibility === "OFFICIAL") return <Badge>oficjalna</Badge>;
	if (pack.visibility === "PUBLIC")
		return (
			<Badge variant="secondary">
				{pack.approved ? "publiczna" : "czeka na akceptację"}
			</Badge>
		);
	return <Badge variant="outline">prywatna</Badge>;
}
