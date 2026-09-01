import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { serializeBinnacleExport } from "@/lib/binnacle";
import type { Prisma, $Enums } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  const actor = await requireRole("ADMIN", "OWNER", "BARBER");
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const eventType = url.searchParams.get("eventType")?.trim() ?? "";
  const severity = url.searchParams.get("severity")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const subjectId = url.searchParams.get("subjectId")?.trim() ?? "";
  const objectId = url.searchParams.get("objectId")?.trim() ?? "";
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";

  const filters: Prisma.BinnacleEntryWhereInput[] = [];
  const where: Prisma.BinnacleEntryWhereInput = {};

  if (q) {
    filters.push({ OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { subjectIdentifier: { contains: q, mode: "insensitive" } },
      { objectIdentifier: { contains: q, mode: "insensitive" } },
      { eventType: { contains: q, mode: "insensitive" } },
    ] });
  }

  if (eventType) filters.push({ eventType: { equals: eventType } });
  if (severity) filters.push({ severity: { equals: severity as $Enums.BinnacleSeverity } });
  if (subjectId) filters.push({ OR: [{ subjectId: { equals: subjectId } }, { createdBy: { equals: subjectId } }] });
  if (objectId) filters.push({ OR: [{ objectId: { equals: objectId } }, { objectIdentifier: { equals: objectId } }] });
  if (from || to) {
    const range: Prisma.DateTimeFilter<"BinnacleEntry"> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    filters.push({ createdAt: range });
  }

  if (actor.role === "BARBER") {
    filters.push({ OR: [{ subjectId: actor.sub }, { createdBy: actor.sub }] });
  }

  if (filters.length) where.AND = filters;

  const entries = await prisma.binnacleEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const payload = serializeBinnacleExport(entries, format);

  return new Response(payload, {
    headers: {
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="binnacle.${format}"`,
    },
  });
}
