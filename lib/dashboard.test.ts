import { describe, it, expect } from "vitest";
import {
  DEFAULT_RANGE,
  resolveRange,
  buildBucketMeta,
  bucketize,
  percentChange,
  type PaymentPoint,
} from "./dashboard";

const TZ = "America/Caracas";

describe("resolveRange", () => {
  it("usa 'week' por defecto cuando no hay rango", () => {
    expect(resolveRange(undefined)).toEqual({ range: "week", rangeDays: 7, rangeLabel: "Últimos 7 días" });
  });

  it("usa 'week' para valores inválidos", () => {
    expect(resolveRange("nonsense").range).toBe(DEFAULT_RANGE);
  });

  it("resuelve rangos válidos", () => {
    expect(resolveRange("3m")).toEqual({ range: "3m", rangeDays: 91, rangeLabel: "Últimos 3 meses" });
    expect(resolveRange("today").rangeDays).toBe(1);
  });

  it("resuelve el rango 'all' (Todos) sin límite de fechas", () => {
    expect(resolveRange("all")).toEqual({ range: "all", rangeDays: 0, rangeLabel: "Histórico" });
  });
});

describe("buildBucketMeta", () => {
  it("crea buckets diarios para 7 días", () => {
    const meta = buildBucketMeta("2026-09-01", "2026-08-25", 7, TZ);
    expect(meta.bucketSize).toBe(1);
    expect(meta.bucketCount).toBe(7);
    expect(meta.bucketLabels).toHaveLength(7);
    expect(meta.bucketLabels[0]).toMatch(/^[A-Z]$/);
  });

  it("crea buckets mensuales para 6 meses", () => {
    const meta = buildBucketMeta("2026-04-01", "2025-10-01", 182, TZ);
    expect(meta.bucketSize).toBe(30);
    expect(meta.bucketCount).toBe(7);
  });

  it("asigna índices de día para periodo y anterior", () => {
    const meta = buildBucketMeta("2026-09-01", "2026-08-25", 7, TZ);
    expect(meta.dayToIndex.get("2026-09-01")).toBe(0);
    expect(meta.dayToIndex.get("2026-09-07")).toBe(6);
    expect(meta.prevDayToIndex.get("2026-08-25")).toBe(0);
  });
});

describe("bucketize", () => {
  it("reparte los pagos en el bucket correcto", () => {
    const meta = buildBucketMeta("2026-09-01", "2026-08-25", 7, TZ);
    const payments: PaymentPoint[] = [
      { amountCents: 100, paidAt: new Date("2026-09-03T18:00:00Z") }, // 2026-09-03 → idx 2
      { amountCents: 250, paidAt: new Date("2026-09-07T18:00:00Z") }, // 2026-09-07 → idx 6
    ];
    const buckets = bucketize(payments, meta.dayToIndex, meta.bucketSize, meta.bucketCount, TZ);
    expect(buckets[2]).toBe(100);
    expect(buckets[6]).toBe(250);
    expect(buckets.reduce((s, v) => s + v, 0)).toBe(350);
  });

  it("ignora pagos nulos y fechas fuera del periodo", () => {
    const meta = buildBucketMeta("2026-09-01", "2026-08-25", 7, TZ);
    const payments: PaymentPoint[] = [
      { amountCents: 50, paidAt: null },
      { amountCents: 999, paidAt: new Date("2026-08-20T18:00:00Z") }, // anterior al rango actual
    ];
    const buckets = bucketize(payments, meta.dayToIndex, meta.bucketSize, meta.bucketCount, TZ);
    expect(buckets.reduce((s, v) => s + v, 0)).toBe(0);
  });
});

describe("percentChange", () => {
  it("calcula la variación porcentual", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("devuelve null cuando el valor anterior es 0", () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});
