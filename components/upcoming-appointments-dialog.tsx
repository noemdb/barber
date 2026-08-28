"use client";
import { useEffect, useState } from "react";
import { CalendarClock, RefreshCw, X } from "lucide-react";
import { tzFormat, zonedDate } from "@/lib/format";

type UpcomingAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
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

export default function UpcomingAppointmentsDialog({
  onClose,
  onGoToDay,
}: {
  onClose: () => void;
  onGoToDay: (iso: string) => void;
}) {
  const [items, setItems] = useState<UpcomingAppointment[]>([]);
  const [timezone, setTimezone] = useState("America/Caracas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/appointments?upcoming=1")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setItems(json.data.appointments);
          setTimezone(json.data.timezone);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  function refresh() {
    setLoading(true);
    fetch("/api/appointments?upcoming=1")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setItems(json.data.appointments);
          setTimezone(json.data.timezone);
        }
        setLoading(false);
      });
  }

  const pending = items.filter((a) => a.status === "PENDING").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 grid place-items-center p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Próximas citas"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <CalendarClock size={19} className="text-zinc-500 dark:text-zinc-400" /> Próximas citas
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Citas pendientes y confirmadas para los próximos días.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Cargando..."
              : `${items.length} cita${items.length === 1 ? "" : "s"} · ${pending} pendiente${pending === 1 ? "" : "s"}`}
          </div>
          <button
            onClick={refresh}
            className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!loading && items.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay citas pendientes o confirmadas próximas.</div>
          )}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((a) => {
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white">
                    <div className="text-center">
                      <div className="text-sm font-bold leading-none">{tzFormat(a.startsAt, timezone, { day: "2-digit" })}</div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        {tzFormat(a.startsAt, timezone, { month: "short" })}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold">
                      <span>{tzFormat(a.startsAt, timezone, { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-zinc-300 dark:text-zinc-500">·</span>
                      <span className="truncate">{a.client.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs capitalize text-zinc-500 dark:text-zinc-400">
                      {tzFormat(a.startsAt, timezone, { weekday: "long", day: "2-digit", month: "long" })} · {a.service.name} · {a.barber.name}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${classes[a.status]}`}>
                    {labels[a.status]}
                  </span>
                  <button
                    onClick={() => onGoToDay(zonedDate(a.startsAt, timezone))}
                    className="shrink-0 text-xs font-semibold hover:underline text-zinc-600 dark:text-zinc-400"
                  >
                    Ver día
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 p-4">
          <button onClick={onClose} className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}