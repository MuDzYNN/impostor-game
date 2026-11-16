import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import type { User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";
import { AuthService, SESSION_COOKIE, STATE_COOKIE } from "./auth.service.js";
import { CurrentUser, SignedIn } from "./session.js";

const renameSchema = z.object({ name: z.string().trim().min(1).max(20) });

function safeRedirect(path: unknown): string {
	return typeof path === "string" &&
		path.startsWith("/") &&
		!path.startsWith("//")
		? path
		: "/";
}

@Controller("auth")
export class AuthController {
	constructor(
		private readonly auth: AuthService,
		private readonly prisma: PrismaService,
	) {}

	@Get("providers")
	providers() {
		return this.auth.enabledProviders();
	}

	@Get("me")
	me(@CurrentUser() user: User | null) {
		return (
			user && {
				id: user.id,
				name: user.name,
				avatarUrl: user.avatarUrl,
				isAdmin: user.isAdmin,
			}
		);
	}

	@UseGuards(SignedIn)
	@Patch("me")
	async rename(
		@CurrentUser() user: User,
		@Body({ schema: renameSchema }) body: z.infer<typeof renameSchema>,
	) {
		const updated = await this.prisma.user.update({
			where: { id: user.id },
			data: { name: body.name },
		});
		return this.me(updated);
	}

	@Post("logout")
	logout(@Res({ passthrough: true }) res: Response) {
		res.clearCookie(SESSION_COOKIE, { path: "/" });
		return { ok: true };
	}

	@Get(":provider/login")
	login(
		@Param("provider") provider: string,
		@Query("redirectTo") redirectTo: string,
		@Res() res: Response,
	) {
		const nonce = randomBytes(16).toString("hex");
		const url = this.auth.loginUrl(provider, nonce);
		res.cookie(
			STATE_COOKIE,
			JSON.stringify({ nonce, redirectTo: safeRedirect(redirectTo) }),
			{
				...this.auth.cookieOptions(),
				maxAge: 10 * 60 * 1000,
			},
		);
		res.redirect(url);
	}

	@Get(":provider/callback")
	async callback(
		@Param("provider") provider: string,
		@Query("code") code: string,
		@Query("state") state: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		let saved: { nonce?: string; redirectTo?: string } = {};
		try {
			saved = JSON.parse(req.cookies?.[STATE_COOKIE] ?? "{}");
		} catch {}
		res.clearCookie(STATE_COOKIE, { path: "/" });
		if (!code || !state || state !== saved.nonce)
			throw new BadRequestException("Nieprawidłowy stan logowania");

		const user = await this.auth.finish(provider, code);
		res.cookie(
			SESSION_COOKIE,
			await this.auth.sign(user.id),
			this.auth.cookieOptions(),
		);
		res.redirect(`${process.env.WEB_URL}${safeRedirect(saved.redirectTo)}`);
	}
}
