import { prisma } from "@/lib/prisma";

const DEFAULT_TIMEZONE = "America/Caracas";

let cachedTz: string | null = null;

export async function getBusinessTimezone(): Promise<string> {
  if (cachedTz) return cachedTz;
  const settings = await prisma.businessSettings.findFirst({ select: { timezone: true } });
  cachedTz = settings?.timezone ?? DEFAULT_TIMEZONE;
  return cachedTz;
}

export function resetBusinessTimezoneCache(): void {
  cachedTz = null;
}

function tzOffsetMs(ms: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(ms)) map[part.type] = part.value;
  return Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second) - ms;
}

export function zonedTimeToUtc(dateTime: string, timeZone: string): Date {
  const wallMs = Date.parse(dateTime);
  if (Number.isNaN(wallMs)) throw new Error(`Fecha/hora inválida: ${dateTime}`);
  const firstGuess = wallMs - tzOffsetMs(wallMs, timeZone);
  const instant = wallMs - tzOffsetMs(firstGuess, timeZone);
  return new Date(instant);
}

export function addZonedDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function zonedNowDate(nowMs: number, timeZone: string): string {
  const d = new Date(nowMs + tzOffsetMs(nowMs, timeZone));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function zonedDayStartUtc(date: string, timeZone: string): Date {
  return zonedTimeToUtc(`${date}T00:00:00`, timeZone);
}

export function zonedDayEndUtc(date: string, timeZone: string): Date {
  return zonedTimeToUtc(`${addZonedDays(date, 1)}T00:00:00`, timeZone);
}