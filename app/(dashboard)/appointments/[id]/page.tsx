import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusClass: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

export default async function AppointmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: { client: true, barber: true, service: true, payment: true },
  });
  if (!a) notFound();

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/appointments" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors">
        ← Volver a citas
      </Link>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Cita de {a.client.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {new Intl.DateTimeFormat("es-VE", { dateStyle: "full", timeStyle: "short" }).format(a.startsAt)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass[a.status] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"}`}>
            {a.status}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-7">
          <Info label="Cliente" value={a.client.name} />
          <Info label="Teléfono" value={a.client.phone || "—"} />
          <Info label="Servicio" value={a.service.name} />
          <Info label="Barbero" value={a.barber.name} />
          <Info label="Duración" value={`${Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000)} min`} />
          <Info label="Total" value={money(a.priceCents)} />
        </div>
        {a.notes && (
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Notas</div>
            <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{a.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-100 dark:border-zinc-800">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}