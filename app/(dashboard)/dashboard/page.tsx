import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, initials } from "@/lib/format";
import { getBusinessTimezone, zonedNowDate, zonedDayStartUtc, zonedDayEndUtc, addZonedDays } from "@/lib/time";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AppointmentsByBarberChart } from "@/components/dashboard/appointments-by-barber-chart";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { WeeklyRevenueChart } from "@/components/dashboard/weekly-revenue-chart";
import { ArrowUpRight, CalendarDays, CircleDollarSign, Scissors, Users, Clock3, BarChart3, PieChart, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const timezone = await getBusinessTimezone();
  const todayStr = zonedNowDate(now.getTime(), timezone);
  const dayStart = zonedDayStartUtc(todayStr, timezone);
  const dayEnd = zonedDayEndUtc(todayStr, timezone);
  const weekStart = zonedDayStartUtc(addZonedDays(todayStr, -6), timezone);

  const [appointments, clientsCount, barbersCount, servicesCount, settings, revenue, recentPayments, soldByService, barbersAppts, paymentsThisWeek] =
    await Promise.all([
      prisma.appointment.findMany({ where: { startsAt: { gte: dayStart, lt: dayEnd } }, include: { client: true, barber: true, service: true }, orderBy: { startsAt: "asc" } }),
      prisma.client.count({ where: { active: true } }),
      prisma.barber.count({ where: { active: true } }),
      prisma.service.count({ where: { active: true } }),
      prisma.businessSettings.findFirst(),
      prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: dayStart, lt: dayEnd } }, _sum: { amountCents: true } }),
      prisma.payment.findMany({ where: { status: "PAID", paidAt: { gte: weekStart } }, select: { amountCents: true, paidAt: true } }),
      prisma.appointment.groupBy({ by: ["serviceId"], where: { status: "COMPLETED" }, _count: { _all: true } }),
      // For appointments-by-barber chart (this week only)
      prisma.appointment.findMany({ where: { startsAt: { gte: weekStart, lt: dayEnd } }, select: { startsAt: true, barberId: true, status: true, barber: { select: { name: true } } } }),
      // For weekly revenue (this week incl. today so far)
      prisma.payment.findMany({ where: { status: "PAID", paidAt: { gte: weekStart, lt: dayEnd } }, select: { amountCents: true, paidAt: true } }),
    ]);

  // Last week payment data
  const lastWeekEnd = zonedDayStartUtc(addZonedDays(todayStr, -7), timezone);
  const lastWeekStart = zonedDayStartUtc(addZonedDays(todayStr, -14), timezone);
  const paymentsLastWeek = await prisma.payment.findMany({
    where: { status: "PAID", paidAt: { gte: lastWeekStart, lt: lastWeekEnd } },
    select: { amountCents: true, paidAt: true },
  });

  const serviceNames = await prisma.service.findMany({
    where: { id: { in: soldByService.map((s) => s.serviceId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(serviceNames.map((s) => [s.id, s.name]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addZonedDays(todayStr, i - 6);
    return {
      label: new Intl.DateTimeFormat("es-VE", { weekday: "narrow", timeZone: timezone }).format(zonedDayStartUtc(dateStr, timezone)).toUpperCase(),
      dayKey: dateStr,
      amount: 0,
    };
  });
  const dayIndex = new Map(days.map((d, i) => [d.dayKey, i]));
  for (const payment of recentPayments) {
    if (!payment.paidAt) continue;
    const idx = dayIndex.get(zonedNowDate(payment.paidAt.getTime(), timezone));
    if (idx !== undefined) days[idx].amount += payment.amountCents;
  }
  const topServices = soldByService
    .map((s) => ({ name: nameById.get(s.serviceId) ?? "Servicio", count: s._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const income = revenue._sum.amountCents ?? 0;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const next = appointments.find((a) => a.startsAt >= now && a.status !== "CANCELLED");
  const statusClass: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
    CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  };
  const statusLabel: Record<string, string> = { CONFIRMED: "Confirmada", PENDING: "Pendiente", COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No asistió" };

  // ── Chart data: appointments per barber ──────────────────────────────
  const barberCountMap = new Map<string, { name: string; count: number }>();
  for (const apt of barbersAppts) {
    const existing = barberCountMap.get(apt.barberId);
    if (existing) {
      existing.count += 1;
    } else {
      barberCountMap.set(apt.barberId, { name: apt.barber.name, count: 1 });
    }
  }
  const barbersWithCounts = [...barberCountMap.values()].sort((a, b) => b.count - a.count);

  // ── Chart data: status distribution (this week) ──────────────────────
  const statusCounts: Record<string, number> = {};
  for (const apt of barbersAppts) {
    statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
  }
  const statuses = [
    { label: "Confirmada", count: statusCounts.CONFIRMED || 0 },
    { label: "Pendiente", count: statusCounts.PENDING || 0 },
    { label: "Completada", count: statusCounts.COMPLETED || 0 },
    { label: "Cancelada", count: statusCounts.CANCELLED || 0 },
    { label: "No asistió", count: statusCounts.NO_SHOW || 0 },
  ].filter((s) => s.count > 0);

  // ── Chart data: weekly revenue comparison ───────────────────────────
  const thisWeekByDay = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addZonedDays(todayStr, i - 6);
    return { dayKey: dateStr, amount: 0 };
  });
  const thisWeekIdx = new Map(thisWeekByDay.map((d, i) => [d.dayKey, i]));
  for (const p of paymentsThisWeek) {
    if (!p.paidAt) continue;
    const idx = thisWeekIdx.get(zonedNowDate(p.paidAt.getTime(), timezone));
    if (idx !== undefined) thisWeekByDay[idx].amount += p.amountCents;
  }

  const lastWeekByDay = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addZonedDays(todayStr, i - 13);
    return { dayKey: dateStr, amount: 0 };
  });
  const lastWeekIdx = new Map(lastWeekByDay.map((d, i) => [d.dayKey, i]));
  for (const p of paymentsLastWeek) {
    if (!p.paidAt) continue;
    const idx = lastWeekIdx.get(zonedNowDate(p.paidAt.getTime(), timezone));
    if (idx !== undefined) lastWeekByDay[idx].amount += p.amountCents;
  }

  const currency = settings?.currency || "USD";

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={CircleDollarSign} label="Ingresos de hoy" value={money(income, currency)} trend="Cobros registrados hoy" />
        <Stat icon={CalendarDays} label="Citas de hoy" value={String(appointments.length)} trend={`${completed} completadas`} />
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
                {appointments.map((a) => (
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
            {appointments.length === 0 && <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay citas para hoy.</div>}
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

      {/* Three new analysis charts */}
      <div className="grid xl:grid-cols-3 gap-4">
        {/* Appointments per barber */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Citas por barbero</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Esta semana</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <AppointmentsByBarberChart barbers={barbersWithCounts} />
          </div>
        </section>

        {/* Status distribution */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Estado de citas</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Esta semana</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <StatusDistributionChart statuses={statuses} />
          </div>
        </section>

        {/* Weekly revenue comparison */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={17} className="text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Ingresos semanales</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Comparativo semanal</p>
            </div>
          </div>
          <div className="mt-3 h-60">
            <WeeklyRevenueChart weeks={[
              { dayKey: thisWeekByDay[0].dayKey, thisWeek: thisWeekByDay[0].amount, lastWeek: lastWeekByDay[0].amount },
              { dayKey: thisWeekByDay[1].dayKey, thisWeek: thisWeekByDay[1].amount, lastWeek: lastWeekByDay[1].amount },
              { dayKey: thisWeekByDay[2].dayKey, thisWeek: thisWeekByDay[2].amount, lastWeek: lastWeekByDay[2].amount },
              { dayKey: thisWeekByDay[3].dayKey, thisWeek: thisWeekByDay[3].amount, lastWeek: lastWeekByDay[3].amount },
              { dayKey: thisWeekByDay[4].dayKey, thisWeek: thisWeekByDay[4].amount, lastWeek: lastWeekByDay[4].amount },
              { dayKey: thisWeekByDay[5].dayKey, thisWeek: thisWeekByDay[5].amount, lastWeek: lastWeekByDay[5].amount },
              { dayKey: thisWeekByDay[6].dayKey, thisWeek: thisWeekByDay[6].amount, lastWeek: lastWeekByDay[6].amount },
            ]} currency={currency} />
          </div>
        </section>
      </div>

      {/* Existing: Recent revenue + Top services */}
      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-4">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Ingresos recientes</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Últimos 7 días</p>
          </div>
          {days.every((d) => d.amount === 0) ? (
            <p className="mt-5 grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">Sin ingresos en los últimos 7 días.</p>
          ) : (
            <div className="mt-4 h-52"><RevenueChart days={days} currency={currency} /></div>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Servicios más vendidos</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Citas completadas por servicio</p>
          <div className="mt-5 space-y-4">
            {topServices.map((service, i) => {
              const width = topServices[0].count > 0 ? Math.round((service.count / topServices[0].count) * 100) : 0;
              return (
                <div className="flex items-center gap-3" key={service.name}>
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-zinc-900 dark:text-zinc-100">
                      <strong>{service.name}</strong>
                      <span className="text-zinc-500 dark:text-zinc-400">{service.count}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-gold rounded-full transition-all duration-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topServices.length === 0 && <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin citas completadas todavía.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof CalendarDays; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
      <div className="flex justify-between items-start">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-zinc-600 dark:text-zinc-400"><Icon size={16} /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">{trend}</div>
    </div>
  );
}
