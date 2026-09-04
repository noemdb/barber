import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, initials } from "@/lib/format";
import { getBusinessTimezone, zonedNowDate, zonedDayStartUtc, zonedDayEndUtc, addZonedDays } from "@/lib/time";
import { resolveRange, buildBucketMeta, percentChange, inclusiveDays, weekdayOf, totalMinutesOpen, hourRange } from "@/lib/dashboard";
import { aggregateRevenueBuckets } from "@/lib/dashboard-queries";
import { getActiveCatalogs, getDashboardSettings } from "@/lib/dashboard-cache";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { BarberPerformance } from "@/components/dashboard/barber-performance";
import { PeakHoursChart } from "@/components/dashboard/peak-hours-chart";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { WeeklyRevenueChart } from "@/components/dashboard/weekly-revenue-chart";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { ArrowUpRight, ArrowDownRight, CalendarDays, CircleDollarSign, Scissors, Users, Clock3, BarChart3, PieChart, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; barberId?: string; serviceId?: string; clientId?: string }>;
}) {
  const sp = await searchParams;
  const { range, rangeDays, rangeLabel } = resolveRange(sp.range);
  const isAll = range === "all";

  const now = new Date();
  const timezone = await getBusinessTimezone();
  const todayStr = zonedNowDate(now.getTime(), timezone);
  const dayStart = zonedDayStartUtc(todayStr, timezone);
  const dayEnd = zonedDayEndUtc(todayStr, timezone);

  // ── Catálogos para los filtros (validados contra la BD, cacheados) ───
  const { barbers: activeBarbers, services: activeServices, clients: activeClients } = await getActiveCatalogs();
  const barberIds = new Set(activeBarbers.map((b) => b.id));
  const serviceIds = new Set(activeServices.map((s) => s.id));
  const clientIds = new Set(activeClients.map((c) => c.id));
  const barberId = sp.barberId && barberIds.has(sp.barberId) ? sp.barberId : "";
  const serviceId = sp.serviceId && serviceIds.has(sp.serviceId) ? sp.serviceId : "";
  const clientId = sp.clientId && clientIds.has(sp.clientId) ? sp.clientId : "";
  const apptFilter =
    barberId || serviceId || clientId
      ? {
          ...(barberId ? { barberId } : {}),
          ...(serviceId ? { serviceId } : {}),
          ...(clientId ? { clientId } : {}),
        }
      : undefined;

  // ── Límites del periodo (el rango "Todos" arranca en la cita más antigua) ──
  const MAX_ALL_DAYS = 365;
  let rangeStartStr: string;
  let periodStart: Date;
  let prevStartStr: string;
  let prevStart: Date;
  let allCapped = false;
  if (isAll) {
    const earliest = await prisma.appointment.findFirst({
      where: apptFilter,
      orderBy: { startsAt: "asc" },
      select: { startsAt: true },
    });
    const earliestDay = earliest ? zonedNowDate(earliest.startsAt.getTime(), timezone) : todayStr;
    // Evita que el histórico crezca sin límite: se acota a los últimos MAX_ALL_DAYS días.
    const cappedStart = addZonedDays(todayStr, -(MAX_ALL_DAYS - 1));
    allCapped = earliestDay < cappedStart;
    rangeStartStr = allCapped ? cappedStart : earliestDay;
    periodStart = zonedDayStartUtc(rangeStartStr, timezone);
    prevStartStr = rangeStartStr;
    prevStart = periodStart;
  } else {
    rangeStartStr = addZonedDays(todayStr, -(rangeDays - 1));
    periodStart = zonedDayStartUtc(rangeStartStr, timezone);
    prevStartStr = addZonedDays(rangeStartStr, -rangeDays);
    prevStart = zonedDayStartUtc(prevStartStr, timezone);
  }
  const periodEnd = zonedDayEndUtc(todayStr, timezone);
  const rangeLabelShown = isAll && allCapped ? `Últimos ${MAX_ALL_DAYS} días` : rangeLabel;

  // ── Datos (periodo + hoy, para la agenda en tiempo real) ─────────────
  const [todayAppointments, periodAppointments, settings] =
    await Promise.all([
      // Agenda de hoy
      prisma.appointment.findMany({
        where: { startsAt: { gte: dayStart, lt: dayEnd }, ...(apptFilter ?? {}) },
        include: { client: true, barber: true, service: true },
        orderBy: { startsAt: "asc" },
      }),
      // Citas del periodo (para análisis)
      prisma.appointment.findMany({
        where: { startsAt: { gte: periodStart, lt: periodEnd }, ...(apptFilter ?? {}) },
        select: {
          id: true,
          status: true,
          priceCents: true,
          startsAt: true,
          endsAt: true,
          service: { select: { id: true, name: true, durationMin: true } },
          barber: { select: { id: true, name: true } },
        },
      }),
      getDashboardSettings(),
    ]);
  const clientsCount = activeClients.length;
  const barbersCount = activeBarbers.length;
  const servicesCount = activeServices.length;

  // ── Buckets de tiempo (diario / semanal / mensual según el rango) ────
  const bucketRangeDays = isAll ? Math.max(1, inclusiveDays(rangeStartStr, todayStr)) : rangeDays;
  const { bucketSize, bucketCount, bucketLabels } = buildBucketMeta(rangeStartStr, prevStartStr, bucketRangeDays, timezone);
  const [currentBucket, prevBucket] = isAll
    ? await Promise.all([
        aggregateRevenueBuckets({ start: periodStart, end: periodEnd, rangeStartStr, bucketSize, bucketCount, timezone, barberId, serviceId, clientId }),
        Promise.resolve(new Array<number>(bucketCount).fill(0)),
      ])
    : await Promise.all([
        aggregateRevenueBuckets({ start: periodStart, end: periodEnd, rangeStartStr, bucketSize, bucketCount, timezone, barberId, serviceId, clientId }),
        aggregateRevenueBuckets({ start: prevStart, end: periodStart, rangeStartStr: prevStartStr, bucketSize, bucketCount, timezone, barberId, serviceId, clientId }),
      ]);

  const revenueBuckets = bucketLabels.map((label, i) => ({ label, amount: currentBucket[i] }));
  const weeklyData = bucketLabels.map((label, i) => ({
    label,
    current: currentBucket[i],
    ...(isAll ? {} : { previous: prevBucket[i] }),
  }));

  // ── Métricas del periodo ─────────────────────────────────────────────
  const income = currentBucket.reduce((sum, v) => sum + v, 0);
  const prevIncome = prevBucket.reduce((sum, v) => sum + v, 0);
  const change = percentChange(income, prevIncome);
  const completedPeriod = periodAppointments.filter((a) => a.status === "COMPLETED").length;

  const statusCounts: Record<string, number> = {};
  for (const apt of periodAppointments) {
    statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
  }
  const statuses = [
    { label: "Confirmada", count: statusCounts.CONFIRMED || 0 },
    { label: "Pendiente", count: statusCounts.PENDING || 0 },
    { label: "Completada", count: statusCounts.COMPLETED || 0 },
    { label: "Cancelada", count: statusCounts.CANCELLED || 0 },
    { label: "No asistió", count: statusCounts.NO_SHOW || 0 },
  ].filter((s) => s.count > 0);

  // ── Desempeño por barbero (citas, ticket, ocupación del horario) ─────
  const minutesOpen = totalMinutesOpen(settings?.hours ?? [], rangeStartStr, todayStr);
  const barberPerfMap = new Map<string, { id: string; name: string; citas: number; completadas: number; revenueCents: number; minutes: number }>();
  for (const apt of periodAppointments) {
    if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") continue;
    let rec = barberPerfMap.get(apt.barber.id);
    if (!rec) {
      rec = { id: apt.barber.id, name: apt.barber.name, citas: 0, completadas: 0, revenueCents: 0, minutes: 0 };
      barberPerfMap.set(apt.barber.id, rec);
    }
    rec.citas += 1;
    rec.minutes += Math.max(0, (apt.endsAt.getTime() - apt.startsAt.getTime()) / 60000);
    if (apt.status === "COMPLETED") {
      rec.completadas += 1;
      rec.revenueCents += apt.priceCents;
    }
  }
  const barbersWithCounts = [...barberPerfMap.values()]
    .map((s) => ({
      id: s.id,
      name: s.name,
      citas: s.citas,
      completadas: s.completadas,
      revenueCents: s.revenueCents,
      avgTicketCents: s.completadas > 0 ? Math.round(s.revenueCents / s.completadas) : 0,
      occupationPct: minutesOpen > 0 ? Math.round((s.minutes / minutesOpen) * 100) : 0,
    }))
    .sort((a, b) => b.citas - a.citas);

  // ── Ticket promedio del periodo (citas completadas) ──────────────────
  const completedAppts = periodAppointments.filter((a) => a.status === "COMPLETED");
  const completedRevenueCents = completedAppts.reduce((sum, a) => sum + a.priceCents, 0);
  const avgTicketCents = completedAppts.length > 0 ? Math.round(completedRevenueCents / completedAppts.length) : 0;

  // ── Servicios por ingreso (no solo conteo de ventas) ─────────────────
  const serviceMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const apt of periodAppointments) {
    if (apt.status !== "COMPLETED") continue;
    let rec = serviceMap.get(apt.service.id);
    if (!rec) {
      rec = { name: apt.service.name, count: 0, revenueCents: 0 };
      serviceMap.set(apt.service.id, rec);
    }
    rec.count += 1;
    rec.revenueCents += apt.priceCents;
  }
  const topServices = [...serviceMap.values()]
    .map((r) => ({ name: r.name, count: r.count, revenueCents: r.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 4);

  // ── Horas pico (día de la semana x hora de inicio) ───────────────────
  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const peakHours = hourRange(settings?.hours ?? []);
  const peakCounts: number[][] = Array.from({ length: 7 }, () => new Array<number>(peakHours.length).fill(0));
  const peakHourIndex = new Map(peakHours.map((h, i) => [h, i]));
  const peakHourFmt = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false });
  for (const apt of periodAppointments) {
    if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") continue;
    const dow = weekdayOf(zonedNowDate(apt.startsAt.getTime(), timezone)) - 1; // 0=Lun..6=Dom
    const hour = parseInt(peakHourFmt.format(apt.startsAt), 10);
    const hi = peakHourIndex.get(hour);
    if (hi === undefined) continue;
    peakCounts[dow][hi] += 1;
  }

  const next = todayAppointments.find((a) => a.startsAt >= now && a.status !== "CANCELLED");
  const statusClass: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  };
  const statusLabel: Record<string, string> = { CONFIRMED: "Confirmada", PENDING: "Pendiente", COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No asistió" };

  const currency = settings?.currency || "USD";
  const periodLabel = `${new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", ...(isAll ? { year: "numeric" } : {}), timeZone: timezone }).format(periodStart)} — ${new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: timezone }).format(now)}`;

  return (
    <div className="space-y-5">
      {/* Header + filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Panel</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{rangeLabelShown} · {periodLabel}</p>
          </div>
        </div>
        <DashboardFilters
          range={range}
          barberId={barberId}
          serviceId={serviceId}
          clientId={clientId}
          barbers={activeBarbers}
          services={activeServices}
          clients={activeClients}
          resultCount={periodAppointments.length}
          resultIncome={money(income, currency)}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={CircleDollarSign} label="Ingresos del periodo" value={money(income, currency)} trend={change === null ? (isAll ? "Todo el histórico" : "Cobros registrados") : `${change >= 0 ? "+" : ""}${change}% vs anterior`} trendDirection={change === null ? undefined : change >= 0 ? "up" : "down"} />
        <Stat icon={CalendarDays} label="Citas del periodo" value={String(periodAppointments.length)} trend={`${completedPeriod} completadas`} />
        <Stat icon={Users} label="Clientes activos" value={String(clientsCount)} trend={`${barbersCount} barberos activos`} />
        <Stat icon={Scissors} label="Servicios activos" value={String(servicesCount)} trend="Catálogo disponible" />
      </div>

      {/* Today's appointments + Next appointment */}
      <div className="grid xl:grid-cols-[minmax(0,1.7fr)_330px] gap-4">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="px-5 py-4 flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Citas de hoy</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Intl.DateTimeFormat("es-VE", { dateStyle: "full", timeZone: timezone }).format(now)}</p>
            </div>
            <Link href="/appointments" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex gap-1 items-center">Ver calendario <ArrowUpRight size={14} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">Hora</th>
                  <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Cliente</th>
                  <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Servicio</th>
                  <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Barbero</th>
                  <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Estado</th>
                  <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Importe</th>
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((a) => (
                  <tr key={a.id} className="border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100">
                    <td className="px-5 py-3 font-semibold text-zinc-600 dark:text-zinc-400">{new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(a.startsAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[9px] font-semibold text-zinc-700 dark:text-zinc-300">{initials(a.client.name)}</div>
                        <span className="font-medium">{a.client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.service.name}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.barber.name}</td>
                    <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>{statusLabel[a.status]}</span></td>
                    <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todayAppointments.length === 0 && <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay citas para hoy.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Próxima cita</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Agenda en tiempo real</p>
            </div>
          </div>
          {next ? (
            <div className="mt-6">
              <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center font-bold text-sm text-zinc-700 dark:text-zinc-300">{initials(next.client.name)}</div>
              <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">{next.client.name}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(next.startsAt)} · {next.service.name}</p>
              <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3 text-xs text-zinc-900 dark:text-zinc-100">
                <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Barbero</span><strong>{next.barber.name}</strong></div>
                <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Duración</span><strong>{Math.round((next.endsAt.getTime() - next.startsAt.getTime()) / 60000)} min</strong></div>
                <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Total</span><strong>{money(next.priceCents, currency)}</strong></div>
              </div>
              <Link href={`/appointments/${next.id}`} className="mt-5 h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">Ver detalles</Link>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay una próxima cita.</div>
          )}
        </section>
      </div>

      {/* Three analysis charts */}
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Desempeño por barbero</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Ticket promedio {money(avgTicketCents, currency)} · {rangeLabelShown}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <BarberPerformance barbers={barbersWithCounts} currency={currency} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Estado de citas</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{rangeLabelShown}</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <StatusDistributionChart statuses={statuses} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Comparativo de ingresos</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{isAll ? "Histórico de ingresos" : "Periodo actual vs anterior"}</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <WeeklyRevenueChart weeks={weeklyData} currency={currency} />
          </div>
        </section>
      </div>

      {/* Revenue + Top services */}
      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-4">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Ingresos del periodo</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{rangeLabelShown}</p>
          </div>
          {revenueBuckets.every((d) => d.amount === 0) ? (
            <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">Sin ingresos en este periodo.</p>
          ) : (
            <div className="mt-4 h-52"><RevenueChart days={revenueBuckets} currency={currency} /></div>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Servicios más facturados</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Por ingreso del periodo</p>
          <div className="mt-5 space-y-4">
            {topServices.map((service, i) => {
              const width = topServices[0].revenueCents > 0 ? Math.round((service.revenueCents / topServices[0].revenueCents) * 100) : 0;
              return (
                <div className="flex items-center gap-3" key={service.name}>
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-zinc-900 dark:text-zinc-100">
                      <strong>{service.name}</strong>
                      <span className="shrink-0 text-zinc-500 dark:text-zinc-400">{money(service.revenueCents, currency)}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {service.count} venta{service.count !== 1 ? "s" : ""} completada{service.count !== 1 ? "s" : ""}
                    </div>
                    <div className="mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-gold rounded-full transition-all duration-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topServices.length === 0 && <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin citas completadas en este periodo.</p>}
          </div>
        </section>
      </div>

      {/* Peak hours heatmap */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock3 size={17} className="text-zinc-500 dark:text-zinc-400" />
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Horas pico</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{rangeLabelShown} · citas por día y hora</p>
          </div>
        </div>
        <div className="mt-4">
          <PeakHoursChart days={DAY_LABELS} hours={peakHours} counts={peakCounts} />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend, trendDirection }: { icon: typeof CalendarDays; label: string; value: string; trend: string; trendDirection?: "up" | "down" }) {
  const arrowColor =
    trendDirection === "up" ? "text-emerald-600 dark:text-emerald-400" : trendDirection === "down" ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
      <div className="flex justify-between items-start">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-zinc-600 dark:text-zinc-400"><Icon size={16} /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
        {trendDirection && (trendDirection === "up" ? <ArrowUpRight size={12} className={arrowColor} /> : <ArrowDownRight size={12} className={arrowColor} />)}
        <span>{trend}</span>
      </div>
    </div>
  );
}
