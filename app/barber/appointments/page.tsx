import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, AppointmentStatus } from "@/app/generated/prisma/client";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { getCurrentBarber, barberScope } from "@/lib/scope";
import { getBusinessTimezone, zonedDayStartUtc, zonedDayEndUtc } from "@/lib/time";
import { money, initials, tzFormat } from "@/lib/format";
import { BarberAppointmentsFilter } from "@/components/barber/appointments-filter";
import { CalendarDays, CheckCircle2, CircleDollarSign, ArrowUpRight, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

const statusClass: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  COMPLETED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  NO_SHOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export default async function BarberAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireRoleOrRedirect("BARBER");
  const barber = await getCurrentBarber(session.sub);
  if (!barber) return null;

  const scope = barberScope(barber);
  const timezone = await getBusinessTimezone();
  const now = new Date();

  const from = DATE_RE.test(sp.from ?? "") ? sp.from! : null;
  const to = DATE_RE.test(sp.to ?? "") ? sp.to! : null;
  const status = STATUSES.has(sp.status ?? "") ? sp.status! : null;
  const q = sp.q?.trim() || null;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const range: Prisma.DateTimeFilter<"Appointment"> = {};
  if (from) range.gte = zonedDayStartUtc(from, timezone);
  if (to) range.lt = zonedDayEndUtc(to, timezone);

  const where: Prisma.AppointmentWhereInput = { ...scope };
  if (range.gte || range.lt) where.startsAt = range;
  if (status) where.status = status as AppointmentStatus;
  if (q) {
    where.client = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  // ── KPIs del mismo filtro (sin sobrescribir donde.startsAt) ──────────
  const [settings, totalCount, upcomingCount, completedCount, totalAmount] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.appointment.count({ where }),
    prisma.appointment.count({
      where: { ...where, AND: [{ status: { in: ["PENDING", "CONFIRMED"] } }, { startsAt: { gte: now } }] },
    }),
    prisma.appointment.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.appointment.aggregate({ where, _sum: { priceCents: true } }),
  ]);
  const currency = settings?.currency || "USD";
  const totalAmountCents = totalAmount._sum.priceCents ?? 0;

  // ── Paginación (clamp antes de consultar la página) ──────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const clampedPage = Math.max(1, Math.min(currentPage, totalPages));
  const items = await prisma.appointment.findMany({
    where,
    include: { client: true, service: true },
    orderBy: { startsAt: "desc" },
    skip: (clampedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const baseParams = new URLSearchParams();
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
  if (status) baseParams.set("status", status);
  if (q) baseParams.set("q", q);
  const pageHref = (page: number) => {
    const p = new URLSearchParams(baseParams);
    if (page > 1) p.set("page", String(page));
    else p.delete("page");
    const qs = p.toString();
    return qs ? `/barber/appointments?${qs}` : "/barber/appointments";
  };

  const rangeLabel =
    from && to
      ? `${tzFormat(zonedDayStartUtc(from, timezone), timezone, { day: "2-digit", month: "short", year: "numeric" })} — ${tzFormat(zonedDayEndUtc(to, timezone), timezone, { day: "2-digit", month: "short", year: "numeric" })}`
      : from || to
        ? "Rango aplicado"
        : "Todo el historial";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Citas</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Agenda propia · {rangeLabel} · {totalCount} citas
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
          <BarberAppointmentsFilter
            key={`${status ?? ""}|${from ?? ""}|${to ?? ""}|${q ?? ""}`}
            from={from ?? ""}
            to={to ?? ""}
            status={status ?? "ALL"}
            q={q ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={CalendarDays} label="Citas" value={String(totalCount)} trend="En el filtro seleccionado" />
        <Stat icon={CalendarClock} label="Próximas" value={String(upcomingCount)} trend="Pendientes o confirmadas" />
        <Stat icon={CheckCircle2} label="Completadas" value={String(completedCount)} trend="En el filtro seleccionado" />
        <Stat icon={CircleDollarSign} label="Monto total" value={money(totalAmountCents, currency)} trend="Suma del importe de las citas" />
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Fecha</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Hora</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Cliente</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Servicio</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Estado</th>
                <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100">
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {tzFormat(a.startsAt, timezone, { weekday: "short", day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-600 dark:text-zinc-400">
                    {tzFormat(a.startsAt, timezone, { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
                        {initials(a.client.name)}
                      </div>
                      <span className="font-medium">{a.client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.service.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>
                      {statusLabel[a.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No hay citas para los filtros seleccionados.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Totales</span> · {totalCount} citas ·{" "}
            {money(totalAmountCents, currency)}
          </p>
          <div className="flex items-center gap-2">
            <PaginationLink href={pageHref(clampedPage - 1)} disabled={clampedPage <= 1}>
              Anterior
            </PaginationLink>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Página {clampedPage} de {totalPages}
            </span>
            <PaginationLink href={pageHref(clampedPage + 1)} disabled={clampedPage >= totalPages}>
              Siguiente <ArrowUpRight size={13} />
            </PaginationLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof CalendarDays; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
      <div className="flex justify-between items-start">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
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
      <span className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 text-xs text-zinc-400 dark:text-zinc-600">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}
