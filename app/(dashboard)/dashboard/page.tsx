import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, initials } from "@/lib/format";
import { getBusinessTimezone, zonedNowDate, zonedDayStartUtc, zonedDayEndUtc, addZonedDays } from "@/lib/time";
import { ArrowUpRight, CalendarDays, CircleDollarSign, Scissors, Users, Clock3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const timezone = await getBusinessTimezone();
  const todayStr = zonedNowDate(now.getTime(), timezone);
  const dayStart = zonedDayStartUtc(todayStr, timezone);
  const dayEnd = zonedDayEndUtc(todayStr, timezone);
  const weekStart = zonedDayStartUtc(addZonedDays(todayStr, -6), timezone);

  const [appointments, clientsCount, barbersCount, servicesCount, settings, revenue, recentPayments, soldByService] =
    await Promise.all([
      prisma.appointment.findMany({ where: { startsAt: { gte: dayStart, lt: dayEnd } }, include: { client: true, barber: true, service: true }, orderBy: { startsAt: "asc" } }),
      prisma.client.count({ where: { active: true } }),
      prisma.barber.count({ where: { active: true } }),
      prisma.service.count({ where: { active: true } }),
      prisma.businessSettings.findFirst(),
      prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: dayStart, lt: dayEnd } }, _sum: { amountCents: true } }),
      prisma.payment.findMany({ where: { status: "PAID", paidAt: { gte: weekStart } }, select: { amountCents: true, paidAt: true } }),
      prisma.appointment.groupBy({ by: ["serviceId"], where: { status: "COMPLETED" }, _count: { _all: true } }),
    ]);

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
  const maxAmount = Math.max(...days.map((d) => d.amount), 1);

  const topServices = soldByService
    .map((s) => ({ name: nameById.get(s.serviceId) ?? "Servicio", count: s._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const income = revenue._sum.amountCents ?? 0;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const next = appointments.find((a) => a.startsAt >= now && a.status !== "CANCELLED");
  const statusClass: Record<string, string> = { CONFIRMED: "bg-emerald-50 text-emerald-700", PENDING: "bg-amber-50 text-amber-700", COMPLETED: "bg-indigo-50 text-indigo-700", CANCELLED: "bg-red-50 text-red-700", NO_SHOW: "bg-zinc-100 text-zinc-600" };
  const statusLabel: Record<string, string> = { CONFIRMED: "Confirmada", PENDING: "Pendiente", COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No asistió" };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={CircleDollarSign} label="Ingresos de hoy" value={money(income, settings?.currency || "USD")} trend="Cobros registrados hoy" />
        <Stat icon={CalendarDays} label="Citas de hoy" value={String(appointments.length)} trend={`${completed} completadas`} />
        <Stat icon={Users} label="Clientes activos" value={String(clientsCount)} trend={`${barbersCount} barberos activos`} />
        <Stat icon={Scissors} label="Servicios activos" value={String(servicesCount)} trend="Catálogo disponible" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.7fr)_330px] gap-4">
        <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 flex items-start justify-between border-b border-zinc-100">
            <div>
              <h2 className="font-semibold">Citas de hoy</h2>
              <p className="text-xs text-zinc-500 mt-1">{new Intl.DateTimeFormat("es-VE", { dateStyle: "full", timeZone: timezone }).format(now)}</p>
            </div>
            <Link href="/appointments" className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 flex gap-1 items-center">Ver calendario <ArrowUpRight size={14} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Hora</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Servicio</th>
                  <th className="px-5 py-3">Barbero</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-t border-zinc-100 text-xs">
                    <td className="px-5 py-3 font-semibold text-zinc-600">{new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(a.startsAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-zinc-100 grid place-items-center text-[9px] font-semibold">{initials(a.client.name)}</div>
                        <span className="font-medium">{a.client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{a.service.name}</td>
                    <td className="px-5 py-3 text-zinc-600">{a.barber.name}</td>
                    <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>{statusLabel[a.status]}</span></td>
                    <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents, settings?.currency || "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {appointments.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">No hay citas para hoy.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={17} className="text-zinc-500" />
            <div>
              <h2 className="font-semibold">Próxima cita</h2>
              <p className="text-xs text-zinc-500 mt-1">Agenda en tiempo real</p>
            </div>
          </div>
          {next ? (
            <div className="mt-6">
              <div className="h-14 w-14 rounded-2xl bg-zinc-100 grid place-items-center font-bold text-sm">{initials(next.client.name)}</div>
              <h3 className="mt-3 font-semibold">{next.client.name}</h3>
              <p className="text-xs text-zinc-500 mt-1">{new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(next.startsAt)} · {next.service.name}</p>
              <div className="mt-5 border-t border-zinc-100 pt-4 space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Barbero</span><strong>{next.barber.name}</strong></div>
                <div className="flex justify-between"><span className="text-zinc-500">Duración</span><strong>{Math.round((next.endsAt.getTime() - next.startsAt.getTime()) / 60000)} min</strong></div>
                <div className="flex justify-between"><span className="text-zinc-500">Total</span><strong>{money(next.priceCents, settings?.currency || "USD")}</strong></div>
              </div>
              <Link href={`/appointments/${next.id}`} className="mt-5 h-10 w-full rounded-xl border border-zinc-200 flex items-center justify-center text-xs font-semibold hover:bg-zinc-50">Ver detalles</Link>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-zinc-500">No hay una próxima cita.</div>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-4">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
          <div>
            <h2 className="font-semibold">Ingresos recientes</h2>
            <p className="text-xs text-zinc-500 mt-1">Últimos 7 días</p>
          </div>
          <div className="mt-5 h-48 flex items-end gap-3 border-b border-zinc-100 px-2">
            {days.map((d) => (
              <div key={d.dayKey} className="flex-1 h-full flex flex-col justify-end gap-2">
                <div className="rounded-t-lg bg-zinc-900 w-full" style={{ height: `${d.amount > 0 ? Math.max((d.amount / maxAmount) * 100, 6) : 2}%` }} />
                <span className="text-center text-[9px] text-zinc-400">{d.label}</span>
              </div>
            ))}
          </div>
          {days.every((d) => d.amount === 0) && <p className="mt-3 text-center text-xs text-zinc-500">Sin ingresos en los últimos 7 días.</p>}
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
          <h2 className="font-semibold">Servicios más vendidos</h2>
          <p className="text-xs text-zinc-500 mt-1">Citas completadas por servicio</p>
          <div className="mt-5 space-y-4">
            {topServices.map((service, i) => {
              const width = topServices[0].count > 0 ? Math.round((service.count / topServices[0].count) * 100) : 0;
              return (
                <div className="flex items-center gap-3" key={service.name}>
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 grid place-items-center text-[10px] font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <strong>{service.name}</strong>
                      <span className="text-zinc-500">{service.count}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topServices.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Sin citas completadas todavía.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof CalendarDays; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
      <div className="flex justify-between items-start">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="h-8 w-8 rounded-lg bg-zinc-100 grid place-items-center"><Icon size={16} /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] text-zinc-500">{trend}</div>
    </div>
  );
}