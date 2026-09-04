import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

type RevenueAggParams = {
  start: Date;
  end: Date;
  rangeStartStr: string;
  bucketSize: number;
  bucketCount: number;
  timezone: string;
  barberId?: string | string[] | null;
  serviceId?: string | string[] | null;
  clientId?: string | string[] | null;
};

type AggRow = { bucket: number; amount: bigint };

function toArray(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Agrega los ingresos (importes en centavos) por bucket usando agregación en la
 * base de datos (`date_trunc` + `AT TIME ZONE`), en lugar de traer todos los
 * pagos y agrupar en JS. El índice de bucket se alinea con `buildBucketMeta`.
 * Soporta filtros multi-valor (`= ANY(...)`) para barbero/servicio/cliente.
 */
export const aggregateRevenueBuckets = unstable_cache(
  async (params: RevenueAggParams): Promise<number[]> => {
    const { start, end, rangeStartStr, bucketSize, bucketCount, timezone } = params;
    const barbers = toArray(params.barberId);
    const services = toArray(params.serviceId);
    const clients = toArray(params.clientId);

    const rows = await prisma.$queryRaw<AggRow[]>`
      SELECT (
        (date_trunc('day', p."paidAt" AT TIME ZONE ${timezone})::date - ${rangeStartStr}::date) / ${bucketSize}
      )::int AS bucket,
        COALESCE(SUM(p."amountCents"), 0)::bigint AS amount
      FROM "Payment" p
      JOIN "Appointment" a ON a."id" = p."appointmentId"
      WHERE p."status" = 'PAID'
        AND p."paidAt" >= ${start}
        AND p."paidAt" < ${end}
        AND (cardinality(${barbers}::text[]) = 0 OR a."barberId" = ANY(${barbers}))
        AND (cardinality(${services}::text[]) = 0 OR a."serviceId" = ANY(${services}))
        AND (cardinality(${clients}::text[]) = 0 OR a."clientId" = ANY(${clients}))
      GROUP BY 1
    `;

    const buckets = new Array<number>(bucketCount).fill(0);
    for (const row of rows) {
      const idx = Number(row.bucket);
      if (idx >= 0 && idx < buckets.length) buckets[idx] = Number(row.amount);
    }
    return buckets;
  },
  ["dashboard-revenue"],
  { revalidate: 300, tags: ["dashboard-revenue"] },
);
