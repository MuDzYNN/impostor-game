import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service.js";

@Injectable()
export class SessionMiddleware implements NestMiddleware {
	constructor(private readonly auth: AuthService) {}

	async use(req: Request, res: Response, next: NextFunction) {
		const token = req.cookies?.[SESSION_COOKIE];
		req.user = await this.auth.userFromToken(token);
		if (req.user && this.auth.needsRenewal(token))
			res.cookie(
				SESSION_COOKIE,
				await this.auth.sign(req.user.id),
				this.auth.cookieOptions(),
			);
		next();
	}
}
