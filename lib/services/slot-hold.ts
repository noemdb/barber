import { prisma } from "@/lib/prisma";
import { DomainError, ErrorCodes } from "@/lib/errors";

export const HOLD_MINUTES = 5;

type HoldLike = { barberId: string; startsAt: Date; endsAt: Date; token: string };

function holdExpiry(now = Date.now()): Date {
  return new Date(now + HOLD_MINUTES * 60_000);
}

function overlaps(start: Date, end: Date, holdStart: Date, holdEnd: Date): boolean {
  return start < holdEnd && end > holdStart;
}

export async function pruneExpiredHolds(): Promise<void> {
  await prisma.slotHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

export async function activeHoldsOverlapping(barberId: string, start: Date, end: Date): Promise<Array<{ token: string; startsAt: Date; endsAt: Date }>> {
  return prisma.slotHold.findMany({
    where: {
      barberId,
      expiresAt: { gt: new Date() },
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
    select: { token: true, startsAt: true, endsAt: true },
  });
}

/** Lanza 409 si otro usuario tiene reservado (hold) el horario. */
export async function assertNoConflictHold(barberId: string, start: Date, end: Date, token?: string): Promise<void> {
  const holds = await activeHoldsOverlapping(barberId, start, end);
  const others = holds.filter((h) => h.token !== token);
  if (others.length > 0) {
    throw new DomainError(ErrorCodes.APPOINTMENT_CONFLICT, "Ese horario está siendo reservado por otra persona en este momento", 409);
  }
}

/** Elimina el hold propio (token) para el horario dado. */
export async function consumeHold(token: string | undefined, barberId: string, start: Date, end: Date): Promise<void> {
  if (!token) return;
  await prisma.slotHold.deleteMany({
    where: { barberId, startsAt: { gte: start, lt: end }, token },
  });
}

/** Crea o refresca un hold; rechaza con 409 si el horario está retenido por otro token. */
export async function createOrRefreshHold(input: HoldLike): Promise<void> {
  await pruneExpiredHolds();
  const holds = await activeHoldsOverlapping(input.barberId, input.startsAt, input.endsAt);
  const mine = holds.some((h) => h.token === input.token);
  const others = holds.filter((h) => h.token !== input.token);
  if (others.length > 0) {
    throw new DomainError(ErrorCodes.APPOINTMENT_CONFLICT, "Ese horario acaba de ser reservado por otra persona", 409);
  }
  const expiresAt = holdExpiry();
  if (mine) {
    await prisma.slotHold.updateMany({
      where: { barberId: input.barberId, startsAt: input.startsAt, token: input.token },
      data: { expiresAt },
    });
  } else {
    await prisma.slotHold.create({
      data: { barberId: input.barberId, startsAt: input.startsAt, endsAt: input.endsAt, token: input.token, expiresAt },
    });
  }
}

/** Devuelve true si un freeSlot queda dentro del rango de un hold ajeno. */
export function isSlotHeldByOther(
  slotStart: Date,
  slotEnd: Date,
  barberId: string,
  ownToken: string,
  holds: Array<{ barberId: string; startsAt: Date; endsAt: Date; token: string }>,
): boolean {
  return holds.some((h) => h.barberId === barberId && h.token !== ownToken && overlaps(slotStart, slotEnd, h.startsAt, h.endsAt));
}
