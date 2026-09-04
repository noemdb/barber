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

export function resolveRange(raw: string | null | undefined): {
  range: string;
  rangeDays: number;
  rangeLabel: string;
} {
  if (raw === RANGE_ALL) return { range: RANGE_ALL, rangeDays: 0, rangeLabel: RANGE_LABEL[RANGE_ALL] };
  const range = raw && RANGE_DAYS[raw] ? raw : DEFAULT_RANGE;
  return { range, rangeDays: RANGE_DAYS[range], rangeLabel: RANGE_LABEL[range] };
}