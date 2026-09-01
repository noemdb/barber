import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, BinnacleCategory, BinnacleSeverity } from "@/app/generated/prisma/client";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { getBusinessTimezone, zonedDayEndUtc, zonedDayStartUtc } from "@/lib/time";
import { BinnacleEntries } from "@/components/binnacle/binnacle-entries";
import { BinnacleFilter } from "@/components/binnacle/binnacle-filter";
import { AlertTriangle, ArrowUpRight, BookOpen, CircleAlert, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = new Set(["AUTHENTICATION", "USER_ACTION", "SYSTEM", "SECURITY", "ERROR"]);
const SEVERITIES = new Set(["DEBUG", "INFO", "WARNING", "CRITICAL", "ALERT"]);

export default async function BarberBinnaclePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string; severity?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireRoleOrRedirect("BARBER");
  const timezone = await getBusinessTimezone();
  const from = DATE_RE.test(sp.from ?? "") ? sp.from! : null;
  const to = DATE_RE.test(sp.to ?? "") ? sp.to! : null;
  const category = CATEGORIES.has(sp.category ?? "") ? sp.category! : null;
  const severity = SEVERITIES.has(sp.severity ?? "") ? sp.severity! : null;
  const q = sp.q?.trim() || null;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.BinnacleEntryWhereInput = {
    OR: [{ subjectId: session.sub }, { createdBy: session.sub }],
  };
  if (from || to) where.createdAt = {
    ...(from ? { gte: zonedDayStartUtc(from, timezone) } : {}),
    ...(to ? { lt: zonedDayEndUtc(to, timezone) } : {}),
  };
  if (category) where.category = category as BinnacleCategory;
  if (severity) where.severity = severity as BinnacleSeverity;
  if (q) {
    where.AND = [{ OR: [
      { eventType: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { subjectIdentifier: { contains: q, mode: "insensitive" } },
      { objectIdentifier: { contains: q, mode: "insensitive" } },
      { ipAddress: { contains: q, mode: "insensitive" } },
    ] }];
  }

  const [totalCount, warningCount, criticalCount, securityCount] = await Promise.all([
    prisma.binnacleEntry.count({ where }),
    prisma.binnacleEntry.count({ where: { ...where, severity: "WARNING" } }),
    prisma.binnacleEntry.count({ where: { ...where, severity: { in: ["CRITICAL", "ALERT"] } } }),
    prisma.binnacleEntry.count({ where: { ...where, category: "SECURITY" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const clampedPage = Math.max(1, Math.min(currentPage, totalPages));
  const entries = await prisma.binnacleEntry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (clampedPage - 1) * PAGE_SIZE, take: PAGE_SIZE });

  const baseParams = new URLSearchParams();
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
  if (category) baseParams.set("category", category);
  if (severity) baseParams.set("severity", severity);
  if (q) baseParams.set("q", q);
  const pageHref = (page: number) => {
    const params = new URLSearchParams(baseParams);
    if (page > 1) params.set("page", String(page)); else params.delete("page");
    const query = params.toString();
    return query ? `/barber/binnacle?${query}` : "/barber/binnacle";
  };
  const rangeLabel = from && to ? "Rango seleccionado" : from || to ? "Rango aplicado" : "Todo el historial";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Bitácora</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Registro de actividad · {rangeLabel} · {totalCount} eventos
        </p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
          <BinnacleFilter key={`${category ?? ""}|${severity ?? ""}|${from ?? ""}|${to ?? ""}|${q ?? ""}`} from={from ?? ""} to={to ?? ""} category={category ?? "ALL"} severity={severity ?? "ALL"} q={q ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={BookOpen} label="Eventos" value={String(totalCount)} trend="En el filtro seleccionado" />
        <Stat icon={AlertTriangle} label="Advertencias" value={String(warningCount)} trend="Requieren atención" />
        <Stat icon={CircleAlert} label="Críticos" value={String(criticalCount)} trend="Críticos y alertas" />
        <Stat icon={ShieldAlert} label="Seguridad" value={String(securityCount)} trend="Eventos de seguridad" />
      </div>

      <BinnacleEntries
        entries={entries}
        footer={
          <div className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold text-zinc-700 dark:text-zinc-300">Totales</span> · {totalCount} eventos</p>
            <div className="flex items-center gap-2">
              <PaginationLink href={pageHref(clampedPage - 1)} disabled={clampedPage <= 1}>Anterior</PaginationLink>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Página {clampedPage} de {totalPages}</span>
              <PaginationLink href={pageHref(clampedPage + 1)} disabled={clampedPage >= totalPages}>Siguiente <ArrowUpRight size={13} /></PaginationLink>
            </div>
          </div>
        }
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof BookOpen; label: string; value: string; trend: string }) {
  return <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4"><div className="flex justify-between items-start"><span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"><Icon size={16} /></span></div><div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div><div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">{trend}</div></div>;
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 text-xs text-zinc-400 dark:text-zinc-600">{children}</span>;
  return <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">{children}</Link>;
}
