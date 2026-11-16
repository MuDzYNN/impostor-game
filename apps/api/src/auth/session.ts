import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
	createParamDecorator,
} from "@nestjs/common";
import type { Request } from "express";
import type { User } from "../generated/prisma/client.js";

declare module "express" {
	interface Request {
		user: User | null;
	}
}

export const CurrentUser = createParamDecorator(
	(_: unknown, ctx: ExecutionContext) => {
		return ctx.switchToHttp().getRequest<Request>().user;
	},
);

@Injectable()
export class SignedIn implements CanActivate {
	canActivate(ctx: ExecutionContext) {
		if (!ctx.switchToHttp().getRequest<Request>().user)
			throw new UnauthorizedException("Zaloguj się");
		return true;
	}
}

@Injectable()
export class AdminOnly implements CanActivate {
	canActivate(ctx: ExecutionContext) {
		const user = ctx.switchToHttp().getRequest<Request>().user;
		if (!user) throw new UnauthorizedException("Zaloguj się");
		if (!user.isAdmin)
			throw new ForbiddenException("Tylko dla administratorów");
		return true;
	}
}
