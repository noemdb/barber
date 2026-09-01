import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";
import { appointmentCreateSchema } from "@/lib/validations";
import { createAppointment, type AppointmentRepository } from "@/lib/services/appointment-service";
import { getBusinessTimezone, zonedDayStartUtc, zonedDayEndUtc } from "@/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";
import { logModelMutation, resolveSubject } from "@/lib/binnacle";

type CreatedAppointment = Prisma.AppointmentGetPayload<{
  include: { client: true; barber: true; service: true };
}>;

const appointmentRepo: AppointmentRepository<CreatedAppointment> = {
  getService: (serviceId) => prisma.service.findUnique({ where: { id: serviceId } }),
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

export async function GET(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const upcoming = url.searchParams.get("upcoming") === "1";
    const timezone = await getBusinessTimezone();
    const where: Prisma.AppointmentWhereInput = {};

    const range: { gte?: Date; lt?: Date } = {};
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      range.gte = zonedDayStartUtc(date, timezone);
      range.lt = zonedDayEndUtc(date, timezone);
    }
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      range.gte = zonedDayStartUtc(from, timezone);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      range.lt = zonedDayEndUtc(to, timezone);
    }
    if (range.gte || range.lt) where.startsAt = range;

    if (upcoming) {
      where.status = { in: ["PENDING", "CONFIRMED"] };
      where.startsAt = { gte: new Date() };
    }
    const appointments = await prisma.appointment.findMany({
      where,
      include: { client: true, barber: true, service: true, payment: true },
      orderBy: { startsAt: "asc" },
      take: upcoming ? 8 : undefined,
    });
    return { data: { appointments, timezone } };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const body = appointmentCreateSchema.parse(await request.json().catch(() => null));
    const data = await createAppointment(appointmentRepo, {
      clientId: body.clientId,
      barberId: body.barberId,
      serviceId: body.serviceId,
      startsAt: new Date(body.startsAt),
      notes: body.notes ?? null,
    });

    const subject = resolveSubject({ id: actor.sub, email: actor.email, role: actor.role, name: actor.name });
    await logModelMutation({
      modelName: "Appointment",
      action: "created",
      after: {
        id: data.id,
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        priceCents: data.priceCents,
      },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request,
      title: "Cita creada",
      description: `Se creó la cita del ${new Date(data.startsAt).toISOString()}.`,
      objectId: data.id,
      objectType: "Appointment",
      category: "USER_ACTION",
      severity: "INFO",
    });

    after(() => notifyAppointmentEvent("APPOINTMENT_CREATED", toTelegramEvent(data)));

    return { data, status: 201 };
  });
}