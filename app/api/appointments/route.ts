import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/permissions";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { appointmentCreateSchema } from "@/lib/validations";
import { createAppointment, type AppointmentRepository } from "@/lib/services/appointment-service";
import type { Prisma } from "@/app/generated/prisma/client";

type CreatedAppointment = Awaited<ReturnType<typeof prisma.appointment.create>>;

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
    await requireStaff();
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const upcoming = url.searchParams.get("upcoming") === "1";
    const where: Prisma.AppointmentWhereInput = {};

    const range: { gte?: Date; lt?: Date } = {};
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      range.gte = new Date(`${date}T00:00:00`);
      const end = new Date(range.gte);
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      range.gte = new Date(`${from}T00:00:00`);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
    if (range.gte || range.lt) where.startsAt = range;

    if (upcoming) {
      where.status = { in: ["PENDING", "CONFIRMED"] };
      where.startsAt = { gte: new Date() };
    }
    const data = await prisma.appointment.findMany({
      where,
      include: { client: true, barber: true, service: true, payment: true },
      orderBy: { startsAt: "asc" },
      take: upcoming ? 8 : undefined,
    });
    return { data };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const body = appointmentCreateSchema.parse(await request.json().catch(() => null));
    const data = await createAppointment(appointmentRepo, {
      clientId: body.clientId,
      barberId: body.barberId,
      serviceId: body.serviceId,
      startsAt: new Date(body.startsAt),
      notes: body.notes ?? null,
    });
    return { data, status: 201 };
  });
}