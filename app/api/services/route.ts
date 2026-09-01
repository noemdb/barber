import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { serviceCreateSchema, servicePatchSchema } from "@/lib/validations";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    return { data: await prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const body = serviceCreateSchema.safeParse(raw);
    if (!body.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de servicio inválidos", 400);

    return {
      data: await prisma.service.create({
        data: { ...body.data, imageUrl: body.data.imageUrl ?? null },
      }),
      status: 201,
    };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const { id, ...rest } = raw as { id?: unknown } & Record<string, unknown>;
    if (typeof id !== "string" || !id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del servicio es obligatorio", 400);

    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);

    const parse = servicePatchSchema.safeParse(rest);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de servicio inválidos", 400);

    const data = {
      ...(parse.data.name !== undefined && { name: parse.data.name }),
      ...(parse.data.description !== undefined && { description: parse.data.description }),
      ...(parse.data.imageUrl !== undefined && { imageUrl: parse.data.imageUrl ?? null }),
      ...(parse.data.durationMin !== undefined && { durationMin: parse.data.durationMin }),
      ...(parse.data.priceCents !== undefined && { priceCents: parse.data.priceCents }),
    };

    return { data: await prisma.service.update({ where: { id }, data }) };
  });
}

export async function DELETE(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || !("id" in raw) || typeof raw.id !== "string") {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del servicio es obligatorio", 400);
    }

    const service = await prisma.service.findUnique({ where: { id: raw.id }, select: { id: true, active: true } });
    if (!service || !service.active) throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);

    await prisma.service.update({ where: { id: raw.id }, data: { active: false } });
    return { data: { ok: true } };
  });
}