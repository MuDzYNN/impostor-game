import "dotenv/config";
import { StandardSchemaValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.use(cookieParser());
	app.enableCors({ origin: process.env.WEB_URL, credentials: true });
	app.useGlobalPipes(new StandardSchemaValidationPipe());
	await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
