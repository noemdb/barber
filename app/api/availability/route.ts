import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { computeAvailability } from "@/lib/services/availability";
import { pruneExpiredHolds, isSlotHeldByOther } from "@/lib/services/slot-hold";

export async function GET(request: Request) {
  return withApi(async () => {
    const ipLimit = rateLimit(`availability:ip:${getClientIp(request)}`, 120, 60_000);
    if (!ipLimit.ok) {
      throw new DomainError(ErrorCodes.RATE_LIMITED, "Demasiadas consultas. Inténtalo en unos minutos.", 429);
    }

    const url = new URL(request.url);
    const now = Date.now();
    const requestedFrom = url.searchParams.get("from");
    const requestedTo = url.searchParams.get("to");
    const token = url.searchParams.get("token") ?? "";
    const rawDuration = Number(url.searchParams.get("durationMin"));
    const durationMin =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? Math.max(1, Math.min(480, Math.round(rawDuration)))
        : undefined;

    const from = requestedFrom && !Number.isNaN(Date.parse(requestedFrom)) ? Date.parse(requestedFrom) : now;
    const to =
      requestedTo && !Number.isNaN(Date.parse(requestedTo))
        ? Math.max(Date.parse(requestedTo), from + 15 * 60_000)
        : from + 2 * 60 * 60 * 1000;

    // Limpieza perezosa de holds vencidos.
    await pruneExpiredHolds();

    const [settings, businessHours, barbers, holds] = await Promise.all([
      prisma.businessSettings.findFirst(),
      prisma.businessHour.findMany({ orderBy: { dayOfWeek: "asc" } }),
      prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.slotHold.findMany({
        where: { expiresAt: { gt: new Date() }, startsAt: { lt: new Date(to) }, endsAt: { gt: new Date(from) } },
        select: { barberId: true, startsAt: true, endsAt: true, token: true },
      }),
    ]);

    const appointments = await prisma.appointment.findMany({
      where: { status: { not: "CANCELLED" }, startsAt: { lt: new Date(to) }, endsAt: { gt: new Date(from) } },
      select: { barberId: true, startsAt: true, endsAt: true },
    });

    const duration = durationMin ?? settings?.appointmentSlot ?? 30;

    const availability = computeAvailability({
      barbers,
      now,
      windowStart: from,
      windowEnd: to,
      timezone: settings?.timezone ?? "America/Caracas",
      appointmentSlot: settings?.appointmentSlot ?? 30,
      durationMin,
      businessHours,
      appointments,
    });

    // Un slot reservado por otro usuario (hold ajeno) no debe mostrarse como libre.
    if (holds.length > 0) {
      for (const barber of availability) {
        if (!barber.freeSlots.length) continue;
        barber.freeSlots = barber.freeSlots.filter((iso) => {
          const start = new Date(iso);
          const end = new Date(start.getTime() + duration * 60_000);
          return !isSlotHeldByOther(start, end, barber.id, token, holds);
        });
      }
    }

    return {
      data: {
        now: new Date(now).toISOString(),
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        timezone: settings?.timezone ?? "America/Caracas",
        barbers: availability,
      },
    };
  });
}
