import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { SessionMiddleware } from "./auth/session.middleware.js";
import { AdminController } from "./packs/admin.controller.js";
import { PacksController } from "./packs/packs.controller.js";
import { PacksService } from "./packs/packs.service.js";
import { PrismaService } from "./prisma.service.js";
import { HistoryService } from "./rooms/history.service.js";
import { RoomsGateway } from "./rooms/rooms.gateway.js";
import { RoomsService } from "./rooms/rooms.service.js";
import { UsersController } from "./users/users.controller.js";

@Module({
	controllers: [
		AuthController,
		PacksController,
		AdminController,
		UsersController,
	],
	providers: [
		PrismaService,
		AuthService,
		PacksService,
		HistoryService,
		RoomsService,
		RoomsGateway,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(SessionMiddleware).forRoutes("*path");
	}
}
