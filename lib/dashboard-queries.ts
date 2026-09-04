import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

type RevenueAggParams = {
  start: Date;
  end: Date;
  rangeStartStr: string;
  bucketSize: number;
  bucketCount: number;
  timezone: string;
  barberId?: string | null;
  serviceId?: string | null;
  clientId?: string | null;
};

type AggRow = { bucket: number; amount: bigint };

/**
 * Agrega los ingresos (importes en centavos) por bucket usando agregación en la
 * base de datos (`date_trunc` + `AT TIME ZONE`), en lugar de traer todos los
 * pagos y agrupar en JS. El índice de bucket se alinea con `buildBucketMeta`.
 */
export const aggregateRevenueBuckets = unstable_cache(
  async (params: RevenueAggParams): Promise<number[]> => {
    const { start, end, rangeStartStr, bucketSize, bucketCount, timezone } = params;
    const barber = params.barberId || null;
    const service = params.serviceId || null;
    const client = params.clientId || null;

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
        AND (${barber}::text IS NULL OR a."barberId" = ${barber})
        AND (${service}::text IS NULL OR a."serviceId" = ${service})
        AND (${client}::text IS NULL OR a."clientId" = ${client})
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
