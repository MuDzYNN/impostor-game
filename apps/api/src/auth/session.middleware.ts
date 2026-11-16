import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service.js";

@Injectable()
export class SessionMiddleware implements NestMiddleware {
	constructor(private readonly auth: AuthService) {}

	async use(req: Request, _res: Response, next: NextFunction) {
		req.user = await this.auth.userFromToken(req.cookies?.[SESSION_COOKIE]);
		next();
	}
}
