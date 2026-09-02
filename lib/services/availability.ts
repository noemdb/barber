import { addZonedDays, zonedNowDate, zonedTimeToUtc } from "@/lib/time";

export type BarberStatus = "available-now" | "available-soon" | "busy" | "closed";

export type AvailabilityBarber = {
  id: string;
  name?: string;
  specialty?: string | null;
  avatar?: string | null;
  status: BarberStatus;
  busyUntil: string | null;
  freeSlots: string[];
};

export type BusinessHourLike = { dayOfWeek: number; openTime: string | null; closeTime: string | null };
export type AppointmentLike = { barberId: string; startsAt: Date; endsAt: Date };
export type BarberLike = { id: string; name?: string; specialty?: string | null; avatar?: string | null };

const DAY_OFFSET_MS = 24 * 60 * 60 * 1000;

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function hasOverlap(
  existing: ReadonlyArray<{ startsAt: Date; endsAt: Date }>,
  start: Date,
  end: Date,
): boolean {
  return existing.some((a) => start < a.endsAt && end > a.startsAt);
}

export function computeAvailability(opts: {
  barbers: BarberLike[];
  now?: number;
  windowStart?: number;
  windowEnd?: number;
  timezone: string;
  appointmentSlot: number;
  durationMin?: number;
  businessHours: BusinessHourLike[];
  appointments: AppointmentLike[];
}): AvailabilityBarber[] {
  const { barbers, timezone, appointmentSlot, businessHours, appointments } = opts;
  const now = opts.now ?? Date.now();
  const duration = opts.durationMin ?? appointmentSlot;
  const ws = opts.windowStart ?? now;
  const we = opts.windowEnd ?? now + 2 * 60 * 60 * 1000;
  const windowStart = new Date(Math.min(ws, we));
  const windowEnd = new Date(Math.max(ws, we));

  const openIntervals: Array<{ start: Date; end: Date; barberId: string }> = [];
  let localDay = zonedNowDate(windowStart.getTime(), timezone);
  for (let i = 0; i < 8; i++) {
    const dayStartUtc = zonedTimeToUtc(`${localDay}T00:00`, timezone);
    if (dayStartUtc >= windowEnd) break;
    const dayOfWeek = weekdayOf(localDay);
    const hours = businessHours.filter((h) => h.dayOfWeek === dayOfWeek && h.openTime && h.closeTime);
    for (const h of hours) {
      const start = zonedTimeToUtc(`${localDay}T${h.openTime}:00`, timezone);
      const end = zonedTimeToUtc(`${localDay}T${h.closeTime}:00`, timezone);
      if (end > windowStart && start < windowEnd) openIntervals.push({ start, end, barberId: "shared" });
    }
    localDay = addZonedDays(localDay, 1);
  }

  const businessOpenInWindow = openIntervals.length > 0;

  return barbers.map((barber) => {
    const barberAppointments = appointments.filter((a) => a.barberId === barber.id);
    const freeSlots: string[] = [];

    for (const interval of openIntervals) {
      const slotStartMs = interval.start.getTime();
      const slotStep = appointmentSlot * 60_000;
      for (let t = slotStartMs; t + duration * 60_000 <= interval.end.getTime(); t += slotStep) {
        const slotStart = new Date(t);
        if (slotStart < windowStart || slotStart >= windowEnd) continue;
        const slotEnd = new Date(t + duration * 60_000);
        if (hasOverlap(barberAppointments, slotStart, slotEnd)) continue;
        freeSlots.push(slotStart.toISOString());
      }
    }
    freeSlots.sort();

    const busyNow = barberAppointments.find((a) => a.startsAt < new Date(now) && a.endsAt > new Date(now));
    const openNow = openIntervals.some((iv) => iv.start.getTime() <= now && now < iv.end.getTime());

    let status: BarberStatus;
    if (!businessOpenInWindow) status = "closed";
    else if (!busyNow && openNow && freeSlots.length > 0) status = "available-now";
    else if (freeSlots.length > 0) status = "available-soon";
    else status = "busy";

    return {
      id: barber.id,
      name: barber.name,
      specialty: barber.specialty,
      avatar: barber.avatar,
      status,
      busyUntil: busyNow ? busyNow.endsAt.toISOString() : null,
      freeSlots,
    };
  });
}

export const NEXT_TWO_HOURS_MS = 2 * 60 * 60 * 1000;
export const _internal = { DAY_OFFSET_MS };
