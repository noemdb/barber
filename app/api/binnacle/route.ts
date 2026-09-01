import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import type { Prisma, $Enums } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER", "BARBER");
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
    const q = url.searchParams.get("q")?.trim() ?? "";
    const eventType = url.searchParams.get("eventType")?.trim() ?? "";
    const severity = url.searchParams.get("severity")?.trim() ?? "";
    const from = url.searchParams.get("from")?.trim() ?? "";
    const to = url.searchParams.get("to")?.trim() ?? "";

    const filters: Prisma.BinnacleEntryWhereInput[] = [];
    const where: Prisma.BinnacleEntryWhereInput = {};

    if (q) {
      filters.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { subjectIdentifier: { contains: q, mode: "insensitive" } },
          { objectIdentifier: { contains: q, mode: "insensitive" } },
          { eventType: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (eventType) {
      filters.push({ eventType: { equals: eventType } });
    }

    if (severity) {
      filters.push({ severity: { equals: severity as $Enums.BinnacleSeverity } });
    }

    if (from || to) {
      const range: Prisma.DateTimeFilter<"BinnacleEntry"> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      filters.push({ createdAt: range });
    }

    if (actor.role === "BARBER") {
      filters.push({
        OR: [
          { subjectId: actor.sub },
          { createdBy: actor.sub },
        ],
      });
    }

    if (filters.length) {
      where.AND = filters;
    }

    const [entries, total] = await Promise.all([
      prisma.binnacleEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.binnacleEntry.count({ where }),
    ]);

    return { data: { entries, total, page, limit } };
  });
}
