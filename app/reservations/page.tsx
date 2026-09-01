import { prisma } from "@/lib/prisma";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { getCurrentClient, clientScope } from "@/lib/scope";
import { getBusinessTimezone, zonedDayEndUtc, zonedDayStartUtc, zonedNowDate } from "@/lib/time";
import { money } from "@/lib/format";
import { CreateAppointmentDialog } from "@/components/client/create-appointment-dialog";
import { WeeklyAvailabilityCalendar } from "@/components/client/weekly-availability-calendar";
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function mondayOf(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

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

export default async function ReservationsPage() {
  const session = await requireRoleOrRedirect("CLIENT");
  const client = await getCurrentClient(session.email);
  if (!client) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Aún no tienes reservas</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cuando reserves, verás aquí tus citas y su estado.
          </p>
        </div>
      </div>
    );
  }

  const scope = clientScope(client);
  const now = new Date();
  const timezone = await getBusinessTimezone();
  const weekStart = mondayOf(zonedNowDate(now.getTime(), timezone));
  const weekEnd = addDays(weekStart, 7);
  const [upcoming, history, completedCount, totalSpent, settings, services, barbers, businessHours, confirmedAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...scope, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gte: now } },
      include: { service: true, barber: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { ...scope, startsAt: { lt: now } },
      include: { service: true, barber: true },
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
    prisma.appointment.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.payment.aggregate({
      where: { status: "PAID", appointment: scope },
      _sum: { amountCents: true },
    }),
    prisma.businessSettings.findFirst(),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMin: true, priceCents: true } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, specialty: true, avatar: true } }),
    prisma.businessHour.findMany({ select: { dayOfWeek: true, openTime: true, closeTime: true } }),
    prisma.appointment.findMany({
      where: { status: "CONFIRMED", startsAt: { gte: zonedDayStartUtc(weekStart, timezone), lt: zonedDayEndUtc(weekEnd, timezone) } },
      include: { barber: { select: { name: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const currency = settings?.currency || "USD";
  const businessName = settings?.businessName || "nuestro barbershop";
  const firstName = client.name.split(" ")[0] || "hello";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-light text-zinc-950">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              ¡Hola, {firstName}! 👋
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Bienvenido/a de nuevo a {businessName}. Qué gusto verte — aquí tienes el estado de tus reservas.
            </p>
            </div>
          </div>
          <CreateAppointmentDialog services={services} barbers={barbers} currency={currency} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={CalendarDays} label="Reservas activas" value={String(upcoming.length)} />
        <Stat icon={Clock3} label="Historial" value={String(history.length)} />
        <Stat icon={CheckCircle2} label="Completadas" value={String(completedCount)} />
        <Stat icon={CircleDollarSign} label="Gasto total" value={money(totalSpent._sum.amountCents ?? 0, currency)} />
      </div>

      <WeeklyAvailabilityCalendar
        weekStart={weekStart}
        timezone={timezone}
        barbers={barbers}
        appointments={confirmedAppointments.map((appointment) => ({
          id: appointment.id,
          barberId: appointment.barberId,
          serviceName: appointment.service.name,
          startsAt: appointment.startsAt.toISOString(),
          endsAt: appointment.endsAt.toISOString(),
        }))}
        businessHours={businessHours}
      />
      <ReservationList title="Próximas reservas" subtitle="Tus próximas citas" items={upcoming} timezone={timezone} currency={currency} />
      <ReservationList title="Historial" subtitle="Reservas pasadas" items={history} timezone={timezone} currency={currency} />
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

function ReservationList({
  title,
  subtitle,
  items,
  timezone,
  currency,
}: {
  title: string;
  subtitle: string;
  items: {
    id: string;
    startsAt: Date;
    status: string;
    priceCents: number;
    service: { name: string };
    barber: { name: string };
  }[];
  timezone: string;
  currency: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between px-5 py-4 text-sm">
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{a.service.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(a.startsAt)} · {a.barber.name}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusClass[a.status]}`}>{statusLabel[a.status]}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{money(a.priceCents, currency)}</span>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay reservas en esta sección.</li>}
      </ul>
    </section>
  );
}
