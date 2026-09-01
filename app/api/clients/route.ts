import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { clientCreateSchema, clientPatchSchema } from "@/lib/validations";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    return { data: await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { _count: { select: { appointments: true } } } }) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const body = clientCreateSchema.safeParse(raw);
    if (!body.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de cliente inválidos", 400);

    return { data: await prisma.client.create({ data: { ...body.data, avatar: body.data.avatar ?? null } }), status: 201 };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const { id, ...rest } = raw as { id?: unknown } & Record<string, unknown>;
    if (typeof id !== "string" || !id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del cliente es obligatorio", 400);

    const client = await prisma.client.findUnique({ where: { id }, select: { id: true, active: true } });
    if (!client || !client.active) throw new DomainError(ErrorCodes.NOT_FOUND, "Cliente no encontrado", 404);

    const parse = clientPatchSchema.safeParse(rest);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de cliente inválidos", 400);

    const data = await prisma.client.update({
      where: { id },
      data: {
        ...(parse.data.name !== undefined && { name: parse.data.name }),
        ...(parse.data.phone !== undefined && { phone: parse.data.phone }),
        ...(parse.data.email !== undefined && { email: parse.data.email }),
        ...(parse.data.notes !== undefined && { notes: parse.data.notes }),
        ...(parse.data.avatar !== undefined && { avatar: parse.data.avatar ?? null }),
      },
    });
    return { data };
  });
}

export async function DELETE(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || !("id" in raw) || typeof raw.id !== "string") {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del cliente es obligatorio", 400);
    }

    const client = await prisma.client.findUnique({ where: { id: raw.id }, select: { id: true, active: true } });
    if (!client || !client.active) throw new DomainError(ErrorCodes.NOT_FOUND, "Cliente no encontrado", 404);

    await prisma.client.update({ where: { id: raw.id }, data: { active: false } });
    return { data: { ok: true } };
  });
}