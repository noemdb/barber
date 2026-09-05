import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { serviceCreateSchema, servicePatchSchema } from "@/lib/validations";
import { replaceServiceBarbers } from "@/lib/services/barber-service";
import { revalidateTag } from "next/cache";
import { logModelMutation } from "@/lib/binnacle";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { barbers: { select: { barberId: true } } },
    });
    return { data: services.map(({ barbers, ...service }) => ({ ...service, barberIds: barbers.map((row) => row.barberId) })) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const body = serviceCreateSchema.safeParse(raw);
    if (!body.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de servicio inválidos", 400);

    const { barberIds, ...serviceData } = body.data;
    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: { ...serviceData, imageUrl: serviceData.imageUrl ?? null },
      });
      await replaceServiceBarbers(tx, created.id, barberIds);
      return created;
    });
    revalidateTag("dashboard-catalogs", "max");
    await logModelMutation({
      modelName: "BarberService",
      action: "created",
      after: { barberId: barberIds, serviceId: service.id },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request,
      title: "Barberos asignados a servicio",
      objectId: service.id,
      objectType: "Service",
    });
    return { data: { ...service, barberIds }, status: 201 };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const { id, ...rest } = raw as { id?: unknown } & Record<string, unknown>;
    if (typeof id !== "string" || !id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del servicio es obligatorio", 400);

    const service = await prisma.service.findUnique({ where: { id }, include: { barbers: { select: { barberId: true } } } });
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

    const hasBarberIds = Object.prototype.hasOwnProperty.call(rest, "barberIds");
    const updated = await prisma.$transaction(async (tx) => {
      const updatedService = await tx.service.update({ where: { id }, data });
      const barberIds = hasBarberIds ? parse.data.barberIds ?? [] : service.barbers.map((row) => row.barberId);
      if (hasBarberIds) await replaceServiceBarbers(tx, id, barberIds);
      return { ...updatedService, barberIds };
    });
    revalidateTag("dashboard-catalogs", "max");
    if (hasBarberIds) {
      await logModelMutation({
        modelName: "BarberService",
        action: "updated",
        before: { barberId: service.barbers.map((row) => row.barberId), serviceId: id },
        after: { barberId: updated.barberIds, serviceId: id },
        actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
        request,
        title: "Barberos de servicio actualizados",
        objectId: id,
        objectType: "Service",
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
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El ID del servicio es obligatorio", 400);
    }

    const service = await prisma.service.findUnique({ where: { id: raw.id }, select: { id: true, active: true } });
    if (!service || !service.active) throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);

    await prisma.service.update({ where: { id: raw.id }, data: { active: false } });
    return { data: { ok: true } };
  });
}