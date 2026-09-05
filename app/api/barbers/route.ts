import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { barberCreateSchema, barberPatchSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";
import { replaceBarberServices } from "@/lib/services/barber-service";
import { revalidateTag } from "next/cache";
import { logModelMutation } from "@/lib/binnacle";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const barbers = await prisma.barber.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { services: { select: { serviceId: true } } },
    });
    return { data: barbers.map(({ services, ...barber }) => ({ ...barber, serviceIds: services.map((row) => row.serviceId) })) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const parse = barberCreateSchema.safeParse(raw);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de barbero inválidos", 400);

    const { serviceIds, ...barberData } = parse.data;
    const barber = await prisma.$transaction(async (tx) => {
      const created = await tx.barber.create({ data: barberData });
      await replaceBarberServices(tx, created.id, serviceIds);
      return created;
    });
    const data = { ...barber, serviceIds };
    revalidateTag("dashboard-catalogs", "max");
    await logModelMutation({
      modelName: "BarberService",
      action: "created",
      after: { barberId: barber.id, serviceId: serviceIds },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request,
      title: "Servicios asignados a barbero",
      objectId: barber.id,
      objectType: "Barber",
    });
    return { data, status: 201 };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const { id, ...rest } = raw as { id?: unknown } & Record<string, unknown>;
    if (typeof id !== "string" || !id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del barbero es obligatorio", 400);

    const barber = await prisma.barber.findUnique({ where: { id }, include: { services: { select: { serviceId: true } } } });
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

    const hasServiceIds = Object.prototype.hasOwnProperty.call(rest, "serviceIds");
    const updated = await prisma.$transaction(async (tx) => {
      const updatedBarber = await tx.barber.update({ where: { id }, data });
      const serviceIds = hasServiceIds ? parse.data.serviceIds ?? [] : barber.services.map((row) => row.serviceId);
      if (hasServiceIds) await replaceBarberServices(tx, id, serviceIds);
      return { ...updatedBarber, serviceIds };
    });

    revalidateTag("dashboard-catalogs", "max");
    if (hasServiceIds) {
      await logModelMutation({
        modelName: "BarberService",
        action: "updated",
        before: { barberId: id, serviceId: barber.services.map((row) => row.serviceId) },
        after: { barberId: id, serviceId: updated.serviceIds },
        actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
        request,
        title: "Servicios de barbero actualizados",
        objectId: id,
        objectType: "Barber",
      });
    }
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