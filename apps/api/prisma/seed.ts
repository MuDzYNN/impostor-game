import "dotenv/config";
import { BUILTIN_WORDS } from "@impostor/game";
import { PrismaService } from "../src/prisma.service.js";

const prisma = new PrismaService();

const existing = await prisma.wordPack.findFirst({
	where: { visibility: "OFFICIAL", name: "Podstawowa" },
});
if (existing) {
	await prisma.$transaction([
		prisma.word.deleteMany({ where: { packId: existing.id } }),
		prisma.word.createMany({
			data: BUILTIN_WORDS.map((w) => ({ ...w, packId: existing.id })),
		}),
	]);
	console.log(
		`Zaktualizowano oficjalną paczkę: ${BUILTIN_WORDS.length} słów`,
	);
} else {
	await prisma.wordPack.create({
		data: {
			name: "Podstawowa",
			visibility: "OFFICIAL",
			approved: true,
			words: { create: BUILTIN_WORDS },
		},
	});
	console.log(`Dodano oficjalną paczkę: ${BUILTIN_WORDS.length} słów`);
}
await prisma.$disconnect();
