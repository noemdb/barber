import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { after } from "next/server";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { bookingSchema } from "@/lib/validations";
import { createAppointment, type AppointmentRepository } from "@/lib/services/appointment-service";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";
import type { Prisma } from "@/app/generated/prisma/client";

type CreatedAppointment = Prisma.AppointmentGetPayload<{
  include: { client: true; barber: true; service: true };
}>;

const bookingRepo: AppointmentRepository<CreatedAppointment> = {
  getService: (serviceId) =>
    prisma.service.findFirst({
      where: { id: serviceId, active: true },
      select: { id: true, durationMin: true, priceCents: true },
    }),
  findBarberAppointments: (barberId, start, end) =>
    prisma.appointment.findMany({
      where: { barberId, status: { not: "CANCELLED" }, startsAt: { lt: end }, endsAt: { gt: start } },
      select: { id: true, startsAt: true, endsAt: true },
    }),
  createAppointment: (data) =>
    prisma.appointment.create({
      data,
      include: { client: true, barber: true, service: true },
    }),
};

export async function POST(request: Request) {
  return withApi(async () => {
    const ipLimit = rateLimit(`booking:ip:${getClientIp(request)}`, 10, 60_000);
    if (!ipLimit.ok) {
      throw new DomainError(ErrorCodes.RATE_LIMITED, "Demasiadas reservas desde esta conexión. Inténtalo en unos minutos.", 429);
    }

    const body = bookingSchema.parse(await request.json().catch(() => null));

    if (new Date(body.startsAt) <= new Date()) {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "La fecha y hora deben ser futuras", 400);
    }

    const email = body.email.toLowerCase().trim();
    const emailLimit = rateLimit(`booking:email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimit.ok) {
      throw new DomainError(ErrorCodes.RATE_LIMITED, "Demasiadas reservas para este correo. Inténtalo más tarde.", 429);
    }

    const barber = await prisma.barber.findFirst({
      where: { id: body.barberId, active: true },
      select: { id: true },
    });
    if (!barber) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);

    let client = await prisma.client.findFirst({ where: { email } });
    if (!client) {
      client = await prisma.client.create({ data: { name: body.name.trim(), email } });
    }

    const data = await createAppointment(bookingRepo, {
      clientId: client.id,
      barberId: body.barberId,
      serviceId: body.serviceId,
      startsAt: new Date(body.startsAt),
      notes: "Reserva web (invitado)",
    });

    after(() => notifyAppointmentEvent("APPOINTMENT_CREATED", toTelegramEvent(data)));

    return { data, status: 201 };
  });
}