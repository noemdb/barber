import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({ mockQueryRaw: vi.fn() }));

// En el runtime de tests `unstable_cache` no tiene contexto de request; se deja
// como identity para ejecutar la función real. El mock de Prisma captura la query.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: (...args: unknown[]) => mockQueryRaw(...args) } }));

import { aggregateRevenueBuckets } from "./dashboard-queries";

const baseParams = {
  start: new Date("2026-09-01T00:00:00Z"),
  end: new Date("2026-09-08T00:00:00Z"),
  rangeStartStr: "2026-09-01",
  bucketSize: 1,
  bucketCount: 7,
  timezone: "America/Caracas",
  barberId: [] as string[],
  serviceId: [] as string[],
  clientId: [] as string[],
};

describe("aggregateRevenueBuckets", () => {
  beforeEach(() => mockQueryRaw.mockReset());

  it("arma la query esperada y mapea filas a buckets", async () => {
    mockQueryRaw.mockResolvedValue([
      { bucket: 0, amount: BigInt(100) },
      { bucket: 2, amount: BigInt(250) },
    ]);

    const buckets = await aggregateRevenueBuckets(baseParams);

    expect(buckets).toEqual([100, 0, 250, 0, 0, 0, 0]);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);

    const query = String(mockQueryRaw.mock.calls[0][0]);
    expect(query).toContain('AT TIME ZONE');
    expect(query).toContain('FROM "Payment"');
    expect(query).toContain('JOIN "Appointment"');
    expect(query).toContain("'PAID'");
    expect(query).toContain("GROUP BY 1");
    // multi-filtro: cardinality(...)=0 desactiva el filtro cuando la lista está vacía
    expect(query).toContain("cardinality(");
    expect(query).toContain("= ANY(");
  });

  it("ignora buckets fuera del rango", async () => {
    mockQueryRaw.mockResolvedValue([{ bucket: 99, amount: BigInt(999) }]);
    const buckets = await aggregateRevenueBuckets(baseParams);
    expect(buckets.every((b) => b === 0)).toBe(true);
  });

  it("pasa los filtros multi-valor como arrays de parámetros", async () => {
    mockQueryRaw.mockResolvedValue([]);
    await aggregateRevenueBuckets({ ...baseParams, barberId: ["b1", "b2"], serviceId: ["s1"], clientId: ["c1"] });
    const values = mockQueryRaw.mock.calls[0].slice(1);
    const arrays = values.filter((v) => Array.isArray(v));
    expect(arrays).toContainEqual(["b1", "b2"]);
    expect(arrays).toContainEqual(["s1"]);
    expect(arrays).toContainEqual(["c1"]);
  });
});
