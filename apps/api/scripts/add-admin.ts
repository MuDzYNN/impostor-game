import "dotenv/config";
import { PrismaService } from "../src/prisma.service.js";

const [id] = process.argv.slice(2);

if (!id) {
	console.error(
		"Użycie: pnpm admin:add <id użytkownika albo Discord/Google ID>",
	);
	process.exit(1);
}

const prisma = new PrismaService();

const user = await prisma.user.findFirst({
	where: { OR: [{ id }, { accounts: { some: { providerAccountId: id } } }] },
});
if (!user) {
	console.error(`Brak użytkownika "${id}", najpierw zaloguj się na stronie`);
	process.exit(1);
}

await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
console.log(`Admin: ${user.name} (${user.id})`);

await prisma.$disconnect();
