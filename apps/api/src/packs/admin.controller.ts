import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminOnly, CurrentUser } from "../auth/session.js";
import type { User } from "../generated/prisma/client.js";
import { PacksService } from "./packs.service.js";

@UseGuards(AdminOnly)
@Controller("admin/packs")
export class AdminController {
	constructor(private readonly packs: PacksService) {}

	@Get("pending")
	pending(@CurrentUser() user: User) {
		return this.packs.pending(user);
	}

	@Post(":id/approve")
	approve(@Param("id") id: string) {
		return this.packs.moderate(id, true);
	}

	@Post(":id/reject")
	reject(@Param("id") id: string) {
		return this.packs.moderate(id, false);
	}
}
