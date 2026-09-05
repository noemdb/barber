import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { DomainError, ErrorCodes } from "@/lib/errors";

export type BarberServiceDb = PrismaClient | Prisma.TransactionClient;

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

async function assertActiveIds(
  tx: BarberServiceDb,
  barberId: string,
  serviceIds: string[],
) {
  const [barber, services] = await Promise.all([
    tx.barber.findUnique({ where: { id: barberId }, select: { id: true, active: true } }),
    serviceIds.length
      ? tx.service.findMany({ where: { id: { in: serviceIds }, active: true }, select: { id: true } })
      : Promise.resolve([]),
  ]);

  if (!barber || !barber.active) {
    throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);
  }

  if (services.length !== serviceIds.length) {
    throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Uno o más servicios no están disponibles", 400);
  }
}

async function assertActiveBarberIds(
  tx: BarberServiceDb,
  serviceId: string,
  barberIds: string[],
) {
  const [service, barbers] = await Promise.all([
    tx.service.findUnique({ where: { id: serviceId }, select: { id: true, active: true } }),
    barberIds.length
      ? tx.barber.findMany({ where: { id: { in: barberIds }, active: true }, select: { id: true } })
      : Promise.resolve([]),
  ]);

  if (!service || !service.active) {
    throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);
  }

  if (barbers.length !== barberIds.length) {
    throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Uno o más barberos no están disponibles", 400);
  }
}

export async function getActiveServicesByBarberId(barberId: string, tx: BarberServiceDb) {
  return tx.service.findMany({
    where: { active: true, barbers: { some: { barberId } } },
    orderBy: { name: "asc" },
  });
}

export async function getActiveBarbersByServiceId(serviceId: string, tx: BarberServiceDb) {
  return tx.barber.findMany({
    where: { active: true, services: { some: { serviceId } } },
    orderBy: { name: "asc" },
  });
}

export async function getServiceIdsByBarberId(barberId: string, tx: BarberServiceDb) {
  const rows = await tx.barberService.findMany({ where: { barberId }, select: { serviceId: true } });
  return rows.map((row) => row.serviceId);
}

export async function getBarberIdsByServiceId(serviceId: string, tx: BarberServiceDb) {
  const rows = await tx.barberService.findMany({ where: { serviceId }, select: { barberId: true } });
  return rows.map((row) => row.barberId);
}

export async function replaceBarberServices(tx: BarberServiceDb, barberId: string, serviceIds: string[]) {
  const normalizedIds = uniqueIds(serviceIds);
  await assertActiveIds(tx, barberId, normalizedIds);
  await tx.barberService.deleteMany({ where: { barberId } });
  if (normalizedIds.length) {
    await tx.barberService.createMany({ data: normalizedIds.map((serviceId) => ({ barberId, serviceId })) });
  }
  return normalizedIds;
}

export async function replaceServiceBarbers(tx: BarberServiceDb, serviceId: string, barberIds: string[]) {
  const normalizedIds = uniqueIds(barberIds);
  await assertActiveBarberIds(tx, serviceId, normalizedIds);
  await tx.barberService.deleteMany({ where: { serviceId } });
  if (normalizedIds.length) {
    await tx.barberService.createMany({ data: normalizedIds.map((barberId) => ({ barberId, serviceId })) });
  }
  return normalizedIds;
}

export async function isActiveAssignment(barberId: string, serviceId: string, tx: BarberServiceDb) {
  const assignment = await tx.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
    select: { barber: { select: { active: true } }, service: { select: { active: true } } },
  });
  return Boolean(assignment?.barber.active && assignment.service.active);
}
