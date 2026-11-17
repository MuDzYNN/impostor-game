"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/use-me";

const TABS = [
	{ href: "/admin", label: "Przegląd" },
	{ href: "/admin/rooms", label: "Pokoje" },
	{ href: "/admin/games", label: "Gry" },
	{ href: "/admin/users", label: "Użytkownicy" },
	{ href: "/admin/packs", label: "Paczki" },
];

function Nav({ pathname }: { pathname?: string }) {
	return (
		<nav className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
			{TABS.map((t) => {
				const active =
					t.href === "/admin"
						? pathname === t.href
						: pathname?.startsWith(t.href);
				return (
					<Link
						key={t.href}
						href={t.href}
						className={cn(
							"rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
							active && "bg-background text-foreground shadow-sm",
						)}
					>
						{t.label}
					</Link>
				);
			})}
		</nav>
	);
}

function ActiveNav() {
	return <Nav pathname={usePathname()} />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
	const { me, loading } = useMe();

	return (
		<div className="flex flex-col gap-6">
			{loading ? (
				<p className="text-muted-foreground">Ładowanie…</p>
			) : !me?.isAdmin ? (
				<p className="text-muted-foreground">
					Tylko dla administratorów.
				</p>
			) : (
				<Suspense fallback={<Nav />}>
					<ActiveNav />
				</Suspense>
			)}
			{/* Always rendered so Next can validate the pages */}
			<div hidden={!me?.isAdmin}>{children}</div>
		</div>
	);
}
