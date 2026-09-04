import { addZonedDays, zonedNowDate, zonedDayStartUtc } from "@/lib/time";

export const DEFAULT_RANGE = "today";

/** Sentinela para "Todos" = todo el histórico (sin límite de fechas). */
export const RANGE_ALL = "all";

export const RANGE_DAYS: Record<string, number> = {
  today: 1,
  week: 7,
  month: 30,
  "3m": 91,
  "6m": 182,
};

export const RANGE_LABEL: Record<string, string> = {
  [RANGE_ALL]: "Histórico",
  today: "Hoy",
  week: "Últimos 7 días",
  month: "Últimos 30 días",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
};

export const RANGE_VALUES = Object.keys(RANGE_LABEL);

export type PaymentPoint = { amountCents: number; paidAt: Date | null };

export function resolveRange(raw: string | null | undefined): {
  range: string;
  rangeDays: number;
  rangeLabel: string;
} {
  if (raw === RANGE_ALL) return { range: RANGE_ALL, rangeDays: 0, rangeLabel: RANGE_LABEL[RANGE_ALL] };
  const range = raw && RANGE_DAYS[raw] ? raw : DEFAULT_RANGE;
  return { range, rangeDays: RANGE_DAYS[range], rangeLabel: RANGE_LABEL[range] };
}

export type BucketMeta = {
  bucketSize: number;
  bucketCount: number;
  dayToIndex: Map<string, number>;
  prevDayToIndex: Map<string, number>;
  bucketLabels: string[];
};

/**
 * Prepara los buckets de tiempo (diario / semanal / mensual) para un rango de
 * fechas. Los índices se mapean por fecha local para alinear el periodo actual
 * y el anterior (misma longitud).
 */
export function buildBucketMeta(
  rangeStartStr: string,
  prevStartStr: string,
  rangeDays: number,
  timezone: string,
): BucketMeta {
  const bucketSize = rangeDays <= 31 ? 1 : rangeDays <= 100 ? 7 : 30;
  const bucketCount = Math.max(1, Math.ceil(rangeDays / bucketSize));

  const dayToIndex = new Map<string, number>();
  const prevDayToIndex = new Map<string, number>();
  for (let i = 0; i < rangeDays; i++) {
    dayToIndex.set(addZonedDays(rangeStartStr, i), i);
    prevDayToIndex.set(addZonedDays(prevStartStr, i), i);
  }

  const bucketLabels: string[] = [];
  const dtf = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-VE", { timeZone: timezone, ...opts });
  for (let i = 0; i < bucketCount; i++) {
    const dk = addZonedDays(rangeStartStr, i * bucketSize);
    const dt = zonedDayStartUtc(dk, timezone);
    let label: string;
    if (bucketSize === 1) {
      label =
        rangeDays === 1
          ? "Hoy"
          : rangeDays <= 7
            ? dtf({ weekday: "narrow" }).format(dt).toUpperCase()
            : dtf({ day: "2-digit", month: "short" }).format(dt);
    } else if (bucketSize === 7) {
      label = dtf({ day: "2-digit", month: "short" }).format(dt);
    } else {
      label = dtf({ month: "short" }).format(dt);
    }
    bucketLabels.push(label);
  }

  return { bucketSize, bucketCount, dayToIndex, prevDayToIndex, bucketLabels };
}

/** Suma los importes de los pagos dentro de cada bucket del periodo. */
export function bucketize(
  payments: PaymentPoint[],
  dayToIndex: Map<string, number>,
  bucketSize: number,
  bucketCount: number,
  timezone: string,
): number[] {
  const buckets = new Array<number>(bucketCount).fill(0);
  for (const p of payments) {
    if (!p.paidAt) continue;
    const idx = dayToIndex.get(zonedNowDate(p.paidAt.getTime(), timezone));
    if (idx === undefined) continue;
    buckets[Math.min(Math.floor(idx / bucketSize), bucketCount - 1)] += p.amountCents;
  }
  return buckets;
}

/** Variación porcentual entre un valor y su referencia (anterior). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Utilidades de horario/calendario para el bloque de insights ────────

export type BusinessHourLike = { dayOfWeek: number; openTime: string | null; closeTime: string | null };

/** Día de la semana con lunes=1..domingo=7 para una fecha 'YYYY-MM-DD'. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ((jsDay + 6) % 7) + 1;
}

/** Días calendario inclusivos entre dos fechas 'YYYY-MM-DD'. */
export function inclusiveDays(startStr: string, endStr: string): number {
  const [ys, ms, ds] = startStr.split("-").map(Number);
  const [ye, me, de] = endStr.split("-").map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000) + 1;
}

/** Ocurrencias de un día de la semana (1=Lun..7=Dom) dentro del rango [startStr,endStr]. */
export function weekdayOccurrences(startStr: string, endStr: string, dow: number): number {
  const total = inclusiveDays(startStr, endStr);
  const offset = (dow - weekdayOf(startStr) + 7) % 7;
  if (offset >= total) return 0;
  return Math.floor((total - 1 - offset) / 7) + 1;
}

/** Minutos entre openTime/closeTime 'HH:MM'; 0 si falta alguno o el rango invierte. */
export function minutesForDay(hour: BusinessHourLike): number {
  if (!hour.openTime || !hour.closeTime) return 0;
  const [oh, om] = hour.openTime.split(":").map(Number);
  const [ch, cm] = hour.closeTime.split(":").map(Number);
  return ch * 60 + cm - (oh * 60 + om);
}

/** Minutos totales de apertura del negocio dentro del rango [startStr,endStr]. */
export function totalMinutesOpen(hours: BusinessHourLike[], startStr: string, endStr: string): number {
  let total = 0;
  for (const h of hours) {
    if (h.dayOfWeek < 1 || h.dayOfWeek > 7) continue;
    const m = minutesForDay(h);
    if (m <= 0) continue;
    total += m * weekdayOccurrences(startStr, endStr, h.dayOfWeek);
  }
  return total;
}

/** Horas enteras de apertura (para las columnas de un heatmap), e.g. [8,9,...,17]. */
export function hourRange(hours: BusinessHourLike[]): number[] {
  let min = 24;
  let max = 0;
  for (const h of hours) {
    if (!h.openTime || !h.closeTime) continue;
    const [oh] = h.openTime.split(":").map(Number);
    const [ch] = h.closeTime.split(":").map(Number);
    if (oh < min) min = oh;
    if (ch > max) max = ch;
  }
  if (max <= min) return [];
  const out: number[] = [];
  for (let h = min; h < max; h++) out.push(h);
  return out;
}
