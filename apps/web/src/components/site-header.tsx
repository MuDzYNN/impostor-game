"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	LibraryIcon,
	LogInIcon,
	LogOutIcon,
	ShieldIcon,
	UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-me";

export function SiteHeader() {
	const { me, loading, logout } = useMe();
	const router = useRouter();

	return (
		<header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
			<div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
				<Link href="/" className="group flex items-center gap-2">
					<Image
						src="/icon.svg"
						alt=""
						width={32}
						height={32}
						className="size-8 rounded-lg transition-transform group-hover:-rotate-6 group-hover:scale-110"
					/>
					<span className="font-heading text-xl font-extrabold tracking-tight">
						impostor
					</span>
				</Link>
				<nav className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						nativeButton={false}
						render={<Link href="/packs" />}
					>
						<LibraryIcon />{" "}
						<span className="hidden sm:inline">Paczki słów</span>
					</Button>
					<div className="flex justify-end">
						{loading ? (
							<Skeleton className="size-8 rounded-full" />
						) : me ? (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="ghost"
											size="icon"
											className="rounded-full"
											aria-label="Konto"
										/>
									}
								>
									<Avatar className="size-8 ring-2 ring-primary/50">
										{me.avatarUrl && (
											<AvatarImage
												src={me.avatarUrl}
												alt=""
											/>
										)}
										<AvatarFallback>
											{me.name.slice(0, 1).toUpperCase()}
										</AvatarFallback>
									</Avatar>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="min-w-48"
								>
									<DropdownMenuGroup>
										<DropdownMenuLabel>
											{me.name}
										</DropdownMenuLabel>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => router.push("/profile")}
									>
										<UserIcon /> Profil i statystyki
									</DropdownMenuItem>
									{me.isAdmin && (
										<DropdownMenuItem
											onClick={() =>
												router.push("/admin")
											}
										>
											<ShieldIcon /> Panel admina
										</DropdownMenuItem>
									)}
									<DropdownMenuItem
										onClick={() => void logout()}
									>
										<LogOutIcon /> Wyloguj
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href="/login" />}
							>
								<LogInIcon /> Zaloguj
							</Button>
						)}
					</div>
				</nav>
			</div>
		</header>
	);
}
