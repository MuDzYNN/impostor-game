import "dotenv/config";
import { StandardSchemaValidationPipe } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.use(cookieParser());
	app.enableCors({ origin: process.env.WEB_URL, credentials: true });
	// Cookies are shared with other mudzyn.xyz subdomains, so lax alone is not enough
	app.use((req: Request, res: Response, next: NextFunction) => {
		const { origin } = req.headers;
		if (
			origin &&
			origin !== process.env.WEB_URL &&
			!["GET", "HEAD", "OPTIONS"].includes(req.method)
		)
			return res.status(403).json({ message: "Niedozwolone źródło" });
		next();
	});
	app.useGlobalPipes(new StandardSchemaValidationPipe());
	await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
