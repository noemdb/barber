import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { verify } from "@/prisma/seed-hash";

const cs = process.env.DATABASE_URL;
if (!cs) { console.error("no DATABASE_URL"); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: cs }) });
const email = "carlos.perez@example.com";
const u = await prisma.user.findUnique({ where: { email } });
if (!u) { console.log("USER NO EXISTE"); }
else {
  console.log("id:", u.id, "| role:", u.role, "| active:", u.active, "| name:", u.name);
  console.log("passwordHash (trunc):", u.passwordHash.slice(0, 24));
  for (const c of ["Client123!", "Cliente123!"]) {
    const [, salt, key] = u.passwordHash.split("$");
    console.log(`verify(${JSON.stringify(c)}) =>`, await verify(c, u.passwordHash));
  }
}
const client = await prisma.client.findFirst({ where: { email } });
console.log("Client record:", client ? `${client.id} ${client.name}` : "NO CLIENT RECORD");
await prisma.$disconnect();
