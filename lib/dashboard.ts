import { addZonedDays, zonedNowDate, zonedDayStartUtc } from "@/lib/time";

export const DEFAULT_RANGE = "week";

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
