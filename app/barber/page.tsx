import { prisma } from "@/lib/prisma";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { getCurrentBarber, barberScope } from "@/lib/scope";
import { getBusinessTimezone, zonedNowDate, zonedDayStartUtc, zonedDayEndUtc } from "@/lib/time";
import { getActiveServicesByBarberId } from "@/lib/services/barber-service";
import { money, initials } from "@/lib/format";
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Scissors, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function BarberHomePage() {
  const session = await requireRoleOrRedirect("BARBER");
  const barber = await getCurrentBarber(session.sub);
  if (!barber) return null;

  const now = new Date();
  const timezone = await getBusinessTimezone();
  const todayStr = zonedNowDate(now.getTime(), timezone);
  const dayStart = zonedDayStartUtc(todayStr, timezone);
  const dayEnd = zonedDayEndUtc(todayStr, timezone);
  const scope = barberScope(barber);

  const [todayAppointments, upcoming, completedCount, paidIncome, settings, services, recurrentClientGroup] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...scope, startsAt: { gte: dayStart, lt: dayEnd } },
      include: { client: true, service: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { ...scope, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gte: now } },
      include: { client: true, service: true },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.appointment.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: dayStart, lt: dayEnd }, appointment: scope },
      _sum: { amountCents: true },
    }),
    prisma.businessSettings.findFirst(),
    getActiveServicesByBarberId(barber.id, prisma),
    prisma.appointment.groupBy({
      by: ["clientId"],
      where: { ...scope, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      _count: { clientId: true },
      orderBy: { _count: { clientId: "desc" } },
      take: 1,
    }),
  ]);

  const recurrentClient = recurrentClientGroup[0]
    ? await prisma.client.findUnique({ where: { id: recurrentClientGroup[0].clientId }, select: { name: true } })
    : null;
  const recurrentClientCount = recurrentClientGroup[0]?._count.clientId ?? 0;

  const currency = settings?.currency || "USD";
  const income = paidIncome._sum.amountCents ?? 0;
  const todayCount = todayAppointments.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={CalendarDays} label="Citas de hoy" value={String(todayCount)} />
        <Stat icon={Clock3} label="Próximas" value={String(upcoming.length)} />
        <Stat icon={CheckCircle2} label="Completadas" value={String(completedCount)} />
        <Stat icon={CircleDollarSign} label="Ingresos de hoy" value={money(income, currency)} />
      </div>

      <section className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 shadow-sm dark:bg-gold/5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-zinc-950">
          <UserRound size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Cliente más recurrente</p>
          {recurrentClient ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">{recurrentClient.name}</p>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{recurrentClientCount} {recurrentClientCount === 1 ? "cita" : "citas"}</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Aún no hay citas registradas.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Mis servicios</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Servicios que tienes habilitados para atender.</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {services.length} {services.length === 1 ? "servicio" : "servicios"}
          </span>
        </div>
        {services.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold dark:bg-gold/10">
                  <Scissors size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{service.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{service.durationMin} min · {money(service.priceCents, currency)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No tienes servicios asociados. Contacta al administrador para actualizar tu perfil.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Citas de hoy</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {new Intl.DateTimeFormat("es-VE", { dateStyle: "full", timeZone: timezone }).format(now)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">Hora</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Cliente</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Servicio</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Estado</th>
                <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Importe</th>
              </tr>
            </thead>
            <tbody>
              {todayAppointments.map((a) => (
                <tr key={a.id} className="border-t border-zinc-100 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                  <td className="px-5 py-3 font-semibold text-zinc-600 dark:text-zinc-400">
                    {new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(a.startsAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {initials(a.client.name)}
                      </div>
                      <span className="font-medium">{a.client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.service.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>{statusLabel[a.status]}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents, currency)}</td>
                </tr>
              ))}
              {todayAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No tienes citas para hoy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Próximas citas</h2>
        <ul className="mt-4 space-y-2">
          {upcoming.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 text-sm dark:border-zinc-800">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{a.client.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(a.startsAt)} · {a.service.name}
                </div>
              </div>
              <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>{statusLabel[a.status]}</span>
            </li>
          ))}
          {upcoming.length === 0 && <li className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin citas próximas.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
