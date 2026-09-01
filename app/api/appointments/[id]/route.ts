import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { appointmentPatchSchema } from "@/lib/validations";
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const data = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, barber: true, service: true, payment: true },
    });
    if (!data) throw new DomainError(ErrorCodes.NOT_FOUND, "Cita no encontrada", 404);
    return { data };
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const body = appointmentPatchSchema.parse(await request.json().catch(() => null));
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new DomainError(ErrorCodes.NOT_FOUND, "Cita no encontrada", 404);
    const data = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { client: true, barber: true, service: true },
    });

    if (body.status && body.status !== existing.status) {
      const type =
        body.status === "CONFIRMED"
          ? "APPOINTMENT_CONFIRMED"
          : body.status === "COMPLETED"
            ? "APPOINTMENT_COMPLETED"
            : null;
      if (type) after(() => notifyAppointmentEvent(type, toTelegramEvent(data)));
    }

    return { data };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new DomainError(ErrorCodes.NOT_FOUND, "Cita no encontrada", 404);
    await prisma.appointment.delete({ where: { id } });
    return { data: { ok: true } };
  });
}