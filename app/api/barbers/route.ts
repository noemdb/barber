import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { barberCreateSchema, barberPatchSchema } from "@/lib/validations";
import { requireStaff, requireRole } from "@/lib/permissions";

export async function GET() {
  return withApi(async () => {
    await requireStaff();
    return { data: await prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const parse = barberCreateSchema.safeParse(raw);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de barbero inválidos", 400);

    const data = await prisma.barber.create({ data: parse.data });
    return { data, status: 201 };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const { id, ...rest } = raw as { id?: unknown } & Record<string, unknown>;
    if (typeof id !== "string" || !id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del barbero es obligatorio", 400);

    const barber = await prisma.barber.findUnique({ where: { id } });
    if (!barber) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);

    const parse = barberPatchSchema.safeParse(rest);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de barbero inválidos", 400);

    const data = {
      ...(parse.data.name !== undefined && { name: parse.data.name }),
      ...(parse.data.email !== undefined && { email: parse.data.email }),
      ...(parse.data.phone !== undefined && { phone: parse.data.phone }),
      ...(parse.data.specialty !== undefined && { specialty: parse.data.specialty }),
      ...(parse.data.avatar !== undefined && { avatar: parse.data.avatar }),
    };

    const updated = await prisma.barber.update({
      where: { id },
      data,
    });

    return { data: updated };
  });
}

export async function DELETE(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || !("id" in raw) || typeof raw.id !== "string") {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del barbero es obligatorio", 400);
    }

    const barber = await prisma.barber.findUnique({ where: { id: raw.id }, select: { id: true, active: true } });
    if (!barber || !barber.active) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);

    await prisma.barber.update({ where: { id: raw.id }, data: { active: false } });
    return { data: { ok: true } };
  });
}