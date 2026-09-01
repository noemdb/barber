import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { getBusinessTimezone, zonedNowDate, zonedDayStartUtc, zonedDayEndUtc, addZonedDays } from "@/lib/time";
import { formatDuration } from "@/lib/visitors";
import { VisitorsOverviewChart } from "@/components/dashboard/visitors-overview-chart";
import { TopSectionsChart } from "@/components/dashboard/top-sections-chart";
import { VisitorsFilter } from "@/components/dashboard/visitors-filter";
import { ArrowUpRight, BarChart3, Clock3, Globe, Smartphone, TrendingUp, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SessionRow = {
  id: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  isOrganic: boolean;
  pagesViewed: number;
  duration: number;
  bounced: boolean;
  firstSeen: Date;
};

export default async function VisitantesPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; device?: string; type?: string; q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN" && session?.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  const timezone = await getBusinessTimezone();
  const todayStr = zonedNowDate(now.getTime(), timezone);
  const monthStart = `${todayStr.slice(0, 8)}01`;

  // Filtros (server-side via searchParams), con defaults seguros ante params malformados.
  const startDate = DATE_RE.test(sp.startDate ?? "") ? sp.startDate! : monthStart;
  const endDate = DATE_RE.test(sp.endDate ?? "") ? sp.endDate! : todayStr;
  const device = ["desktop", "mobile", "tablet"].includes(sp.device ?? "") ? sp.device! : null;
  const type = ["ORGANIC", "DIRECT", "REFERRAL"].includes(sp.type ?? "") ? sp.type! : null;
  const q = sp.q?.trim() || null;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const periodStart = zonedDayStartUtc(startDate, timezone);
  const periodEnd = zonedDayEndUtc(endDate, timezone);

  const where: Prisma.VisitorSessionWhereInput = { firstSeen: { gte: periodStart, lt: periodEnd } };
  if (device) where.device = { equals: device };
  if (type === "ORGANIC") where.isOrganic = true;
  else if (type === "DIRECT") where.referrer = null;
  else if (type === "REFERRAL") {
    where.isOrganic = false;
    where.referrer = { not: null };
  }
  if (q) {
    where.OR = [
      { country: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { referrer: { contains: q, mode: "insensitive" } },
    ];
  }

  // ── KPIs (mismo periodo) ─────────────────────────────────────────────
  const [totalVisitors, organicVisitors, bouncedVisitors, avgDur] = await Promise.all([
    prisma.visitorSession.count({ where }),
    prisma.visitorSession.count({ where: { ...where, isOrganic: true } }),
    prisma.visitorSession.count({ where: { ...where, bounced: true } }),
    prisma.visitorSession.aggregate({ where, _avg: { duration: true } }),
  ]);
  const bounceRate = totalVisitors > 0 ? Math.round((bouncedVisitors / totalVisitors) * 100) : 0;
  const avgDuration = Math.round(avgDur._avg.duration ?? 0);

  // ── Top páginas (mismo periodo — fix §7.2) ──────────────────────────
  const pageRows = await prisma.pageView.groupBy({
    by: ["path"],
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    _count: { _all: true },
    orderBy: { _count: { path: "desc" } },
    take: 10,
  });
  const topSections = pageRows.map((row) => ({ path: row.path || "/", count: row._count._all }));

  // ── Overview 30 días (siempre los últimos 30 días, sin cap take:500) ─
  // Nota de escala: la agregación diaria se hace en JS (patrón del dashboard).
  // Con mucho volumen conviene pasar a `groupBy`/`date_trunc` raw SQL (ver §7.5 del spec).
  const overviewStart = addZonedDays(todayStr, -29);
  const overviewSessions = await prisma.visitorSession.findMany({
    where: { firstSeen: { gte: zonedDayStartUtc(overviewStart, timezone), lt: zonedDayEndUtc(todayStr, timezone) } },
    select: { firstSeen: true, isOrganic: true },
  });
  const overview = Array.from({ length: 30 }, (_, i) => {
    const dateStr = addZonedDays(todayStr, i - 29);
    return {
      label: new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", timeZone: timezone }).format(
        zonedDayStartUtc(dateStr, timezone),
      ),
      total: 0,
      organic: 0,
    };
  });
  const ovIdx = new Map<string, number>();
  overview.forEach((_, i) => ovIdx.set(addZonedDays(todayStr, i - 29), i));
  for (const s of overviewSessions) {
    const idx = ovIdx.get(zonedNowDate(s.firstSeen.getTime(), timezone));
    if (idx === undefined) continue;
    overview[idx].total += 1;
    if (s.isOrganic) overview[idx].organic += 1;
  }

  // ── Tabla de sesiones (paginación + filtros server-side) ────────────
  // Se calcula el total primero para poder clampear la página antes de consultar
  // (un `?page=` fuera de rango no debe dejar la tabla vacía bajo un "Página X de Y" inconsistente).
  const sessionCount = await prisma.visitorSession.count({ where });
  const totalPages = Math.max(1, Math.ceil(sessionCount / PAGE_SIZE));
  const clampedPage = Math.max(1, Math.min(currentPage, totalPages));
  const sessions = await prisma.visitorSession.findMany({
    where,
    orderBy: { firstSeen: "desc" },
    skip: (clampedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // URL base de los filtros actuales, para la paginación.
  const baseParams = new URLSearchParams();
  if (startDate) baseParams.set("startDate", startDate);
  if (endDate) baseParams.set("endDate", endDate);
  if (device) baseParams.set("device", device);
  if (type) baseParams.set("type", type);
  if (q) baseParams.set("q", q);
  const pageHref = (page: number) => {
    const p = new URLSearchParams(baseParams);
    if (page > 1) p.set("page", String(page));
    else p.delete("page");
    const qs = p.toString();
    return qs ? `/visitantes?${qs}` : "/visitantes";
  };

  const periodLabel = `${new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: timezone }).format(periodStart)} — ${new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: timezone }).format(zonedDayStartUtc(endDate, timezone))}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Visitantes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Audiencia anónima de la landing · {periodLabel}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
          <VisitorsFilter startDate={startDate} endDate={endDate} device={device ?? "ALL"} type={type ?? "ALL"} q={q ?? ""} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={Users} label="Visitas" value={String(totalVisitors)} trend="Sesiones en el periodo" />
        <Stat icon={TrendingUp} label="Orgánicas" value={String(organicVisitors)} trend="Tráfico de buscadores" />
        <Stat icon={Clock3} label="Rebote" value={`${bounceRate}%`} trend="Sesiones de 1 página" />
        <Stat icon={BarChart3} label="Duración media" value={formatDuration(avgDuration)} trend="Por sesión" />
      </div>

      {/* Charts */}
      <div className="grid xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Visitas · 30 días</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Total y orgánicas</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <VisitorsOverviewChart days={overview} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Páginas más visitadas</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Del periodo seleccionado</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <TopSectionsChart sections={topSections} />
          </div>
        </section>
      </div>

      {/* Sessions table */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Sesiones</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{sessionCount} en el periodo</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Ubicación</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Dispositivo</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Fuente</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Páginas</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Duración</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Rebote</th>
                <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Primera visita</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100">
                  <td className="px-5 py-3">
                    {s.country || s.city ? (
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone size={13} />
                      {deviceLabel(s.device)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${sourceBadge(s).cls}`}>{sourceBadge(s).label}</span>
                      {hostname(s.referrer) && (
                        <span className="hidden lg:inline text-[10px] text-zinc-500 dark:text-zinc-400">{hostname(s.referrer)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{s.pagesViewed}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{formatDuration(s.duration)}</td>
                  <td className="px-5 py-3">
                    {s.bounced ? (
                      <span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-600 dark:text-zinc-400">Rebotó</span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(s.firstSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay sesiones para los filtros seleccionados.</div>
          )}
        </div>

        {/* Pagination server-side */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Página {clampedPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <PaginationLink href={pageHref(clampedPage - 1)} disabled={clampedPage <= 1}>
              Anterior
            </PaginationLink>
            <PaginationLink href={pageHref(clampedPage + 1)} disabled={clampedPage >= totalPages}>
              Siguiente <ArrowUpRight size={13} />
            </PaginationLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof Users; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
      <div className="flex justify-between items-start">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-zinc-600 dark:text-zinc-400">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">{trend}</div>
    </div>
  );
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600 inline-flex items-center gap-1 cursor-not-allowed">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
    >
      {children}
    </Link>
  );
}

function deviceLabel(device: string | null): string {
  if (device === "desktop") return "Escritorio";
  if (device === "mobile") return "Móvil";
  if (device === "tablet") return "Tableta";
  return "—";
}

function sourceBadge(s: SessionRow): { label: string; cls: string } {
  if (s.isOrganic) return { label: "Orgánico", cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" };
  if (!s.referrer) return { label: "Directo", cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" };
  return { label: "Referido", cls: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" };
}

function hostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
