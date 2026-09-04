"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { money, tzFormat } from "@/lib/format";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents?: number;
  notes?: string | null;
  client: { id: string; name: string; phone: string | null };
  barber: { id: string; name: string };
  service: { id: string; name: string };
};

const labels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};
const classes: Record<string, string> = {
  PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

export default function AppointmentDetailDialog({
  appointment,
  timezone,
  onClose,
}: {
  appointment: Appointment;
  timezone: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = appointment;
  const minutes = Math.round((new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cita de ${a.client.name}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Cita de {a.client.name}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {tzFormat(a.startsAt, timezone, { dateStyle: "full", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${classes[a.status] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"}`}>
              {labels[a.status] ?? a.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Info label="Cliente" value={a.client.name} />
          <Info label="Teléfono" value={a.client.phone || "—"} />
          <Info label="Servicio" value={a.service.name} />
          <Info label="Barbero" value={a.barber.name} />
          <Info label="Duración" value={`${minutes} min`} />
          <Info label="Total" value={money(a.priceCents ?? 0)} />
        </div>

        {a.notes && (
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Notas</div>
            <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{a.notes}</p>
          </div>
        )}

        <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4 flex items-center justify-between gap-2">
          <Link
            href={`/appointments/${a.id}`}
            className="text-xs font-semibold inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Ver página completa <ArrowUpRight size={13} />
          </Link>
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors"
          >
            Cerrar
          </button>
        </div>
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
