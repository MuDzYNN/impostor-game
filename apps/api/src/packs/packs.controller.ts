import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from "@nestjs/common";
import { CurrentUser, SignedIn } from "../auth/session.js";
import type { User } from "../generated/prisma/client.js";
import { packSchema, PacksService, type PackInput } from "./packs.service.js";

@Controller()
export class PacksController {
	constructor(private readonly packs: PacksService) {}

	@Get("packs")
	list(@CurrentUser() user: User | null) {
		return this.packs.list(user);
	}

	@Get("packs/:id")
	get(@Param("id") id: string, @CurrentUser() user: User | null) {
		return this.packs.get(id, user);
	}

	@Get("words")
	words(@Query("packIds") packIds?: string) {
		return this.packs.wordsFor(
			packIds ? packIds.split(",").filter(Boolean) : [],
		);
	}

	@UseGuards(SignedIn)
	@Post("packs")
	create(
		@CurrentUser() user: User,
		@Body({ schema: packSchema }) body: PackInput,
	) {
		return this.packs.create(user, body);
	}

	@UseGuards(SignedIn)
	@Put("packs/:id")
	update(
		@Param("id") id: string,
		@CurrentUser() user: User,
		@Body({ schema: packSchema }) body: PackInput,
	) {
		return this.packs.update(id, user, body);
	}

	@UseGuards(SignedIn)
	@Delete("packs/:id")
	remove(@Param("id") id: string, @CurrentUser() user: User) {
		return this.packs.remove(id, user);
	}
}
