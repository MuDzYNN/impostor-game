import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import { AdminOnly, CurrentUser } from "../auth/session.js";
import type { User } from "../generated/prisma/client.js";
import { adminSchema, AdminService, type AdminInput } from "./admin.service.js";

const pagePipe = [new DefaultValuePipe(1), ParseIntPipe] as const;

@UseGuards(AdminOnly)
@Controller("admin")
export class AdminPanelController {
	constructor(private readonly admin: AdminService) {}

	@Get("stats")
	stats() {
		return this.admin.stats();
	}

	@Get("rooms")
	rooms() {
		return this.admin.liveRooms();
	}

	@Get("games")
	games(
		@Query("page", ...pagePipe) page: number,
		@Query("userId") userId?: string,
	) {
		return this.admin.games(Math.max(1, page), userId);
	}

	@Get("games/:id")
	game(@Param("id") id: string) {
		return this.admin.game(id);
	}

	@Get("users")
	users(@Query("page", ...pagePipe) page: number, @Query("q") q?: string) {
		return this.admin.users(Math.max(1, page), q?.trim());
	}

	@Post("users/:id/admin")
	setAdmin(
		@Param("id") id: string,
		@CurrentUser() user: User,
		@Body({ schema: adminSchema }) body: AdminInput,
	) {
		return this.admin.setAdmin(id, user, body);
	}
}
