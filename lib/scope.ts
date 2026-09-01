import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/** Resuelve el registro de barbero vinculado al usuario autenticado (session.sub). */
export async function getCurrentBarber(sessionSub: string) {
  return prisma.barber.findUnique({ where: { userId: sessionSub } });
}

/** Scope propio del barbero: solo sus citas. */
export function barberScope(barber: { id: string }): Prisma.AppointmentWhereInput {
  return { barberId: barber.id };
}

/**
 * Resuelve el cliente propio por email. `Client.email` no es único en el schema,
 * así que se usa `findFirst` (el primero creado con ese correo).
 */
export async function getCurrentClient(email: string) {
  return prisma.client.findFirst({
    where: { email },
    orderBy: { createdAt: "asc" },
  });
}

/** Scope propio del cliente: solo sus reservas. */
export function clientScope(client: { id: string }): Prisma.AppointmentWhereInput {
  return { clientId: client.id };
}
