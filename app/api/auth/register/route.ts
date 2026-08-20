import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { registerSchema } from "@/lib/validations";
import { createSession } from "@/lib/auth";
import { hash } from "@/prisma/seed-hash";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = registerSchema.parse(await request.json().catch(() => null));
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Ya existe una cuenta con ese correo", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash: await hash(body.password),
        role: "CLIENT",
      },
    });

    const existingClient = await prisma.client.findFirst({ where: { email } });
    if (!existingClient) {
      await prisma.client.create({ data: { name: body.name.trim(), email } });
    }

    await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email });
    return { data: { ok: true, role: user.role } };
  });
}