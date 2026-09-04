"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock, Loader2, Scissors, X } from "lucide-react";
import { newHoldToken, next3Days, dayLabel } from "@/components/landing/use-booking-wizard";

type Option = { id: string; name: string; durationMin?: number; priceCents?: number; specialty?: string | null };

const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const localTimeStr = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function CreateAppointmentDialog({
  services,
  barbers,
  currency,
}: {
  services: Option[];
  barbers: Option[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Disponibilidad del barbero ──────────────────────────────────────────
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [activeDay, setActiveDay] = useState("");
  const [holdToken, setHoldToken] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedService = services.find((s) => s.id === serviceId);
  const days = next3Days();

  const resetAndOpen = useCallback(
    (detail?: { date?: string; time?: string; barberId?: string }) => {
      setSuccess(false);
      setError("");
      setSlots({});
      setActiveDay("");
      setRefreshKey(0);
      setHoldToken(newHoldToken());
      if (detail?.barberId) setBarberId(detail.barberId);
      if (detail?.date) setDate(detail.date);
      if (detail?.time) setTime(detail.time);
      setSlotsLoading(Boolean(serviceId && (detail?.barberId || barberId)));
      setOpen(true);
    },
    [serviceId, barberId],
  );

  useEffect(() => {
    const openFromCalendar = (event: Event) => {
      resetAndOpen((event as CustomEvent<{ date?: string; time?: string; barberId?: string }>).detail ?? {});
    };
    window.addEventListener("barber:open-booking", openFromCalendar);
    return () => window.removeEventListener("barber:open-booking", openFromCalendar);
  }, [resetAndOpen]);

  // Consultar disponibilidad para el barbero + servicio seleccionado.
  useEffect(() => {
    if (!open || !serviceId || !barberId) return;
    let cancelled = false;
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 3);
    to.setHours(23, 59, 59, 999);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), token: holdToken });
    if (selectedService?.durationMin) qs.set("durationMin", String(selectedService.durationMin));
    fetch(`/api/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const barbers = (json.data?.barbers ?? []) as Array<{ id?: string; freeSlots?: string[] }>;
        const barber = barbers.find((b) => b.id === barberId);
        const byDay: Record<string, string[]> = {};
        for (const iso of barber?.freeSlots ?? []) {
          const day = localDateStr(new Date(iso));
          (byDay[day] ??= []).push(iso);
        }
        setSlots(byDay);
        setActiveDay((prev) => (prev && byDay[prev] ? prev : (Object.keys(byDay)[0] ?? "")));
        setSlotsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setSlots({});
          setSlotsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, serviceId, barberId, holdToken, refreshKey, selectedService?.durationMin]);

  function holdSlot(startsAtIso: string) {
    const durationMin = selectedService?.durationMin ?? 30;
    fetch("/api/availability/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, startsAt: startsAtIso, durationMin, token: holdToken }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setError(j?.error?.message ?? "Ese horario acaba de ser reservado por otra persona");
          setRefreshKey((k) => k + 1);
          setSlotsLoading(true);
        }
      })
      .catch(() => {});
  }

  function close() {
    if (!submitting) setOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const startsAt = new Date(`${date}T${time}:00`);
    if (!date || !time || startsAt <= new Date()) {
      setError("Selecciona una fecha y hora futuras.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, barberId, startsAt: startsAt.toISOString(), holdToken, notes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "No fue posible registrar la cita");
      router.refresh();
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible registrar la cita");
    } finally {
      setSubmitting(false);
    }
  }

  const picksSlot = (iso: string) => {
    const d = new Date(iso);
    setDate(localDateStr(d));
    setTime(localTimeStr(d));
    holdSlot(iso);
  };

  return (
    <>
      <button type="button" onClick={() => resetAndOpen()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light">
        <Calendar size={15} /> Registrar cita
      </button>
      {open && (
        <div className="fixed inset-0 z-70 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div role="dialog" aria-modal="true" aria-labelledby="create-appointment-title" className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <button type="button" onClick={close} aria-label="Cerrar" className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"><X size={18} /></button>
            {success ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={42} />
                <h2 id="create-appointment-title" className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Cita registrada</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Tu reserva quedó pendiente de confirmación.</p>
                <button type="button" onClick={close} className="mt-6 h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-light text-zinc-950"><Scissors size={18} /></div><div><h2 id="create-appointment-title" className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Registrar cita</h2><p className="text-xs text-zinc-500 dark:text-zinc-400">Precios en {currency}</p></div></div>
                <div className="mt-5 space-y-3">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Servicio<select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlotsLoading(true); }} required className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">{services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.priceCents !== undefined ? ` · ${(service.priceCents / 100).toFixed(2)} ${currency}` : ""}</option>)}</select></label>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Barbero<select value={barberId} onChange={(e) => { setBarberId(e.target.value); setSlotsLoading(true); }} required className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}{barber.specialty ? ` · ${barber.specialty}` : ""}</option>)}</select></label>

                  {serviceId && barberId && (
                    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
                        <Clock size={11} /> Horarios disponibles · próximos 3 días
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {days.map((day) => (
                          <button
                            type="button"
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              activeDay === day
                                ? "border-gold bg-gold/15 text-gold"
                                : "border-zinc-200 text-zinc-600 hover:border-gold/60 hover:text-gold dark:border-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {dayLabel(day)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {slotsLoading ? (
                          <span className="flex items-center gap-1.5 text-[12px] text-zinc-400"><Loader2 size={12} className="animate-spin" /> Buscando disponibilidad…</span>
                        ) : (slots[activeDay]?.length ? (
                          slots[activeDay].map((iso) => {
                            const d = new Date(iso);
                            const selected = time === localTimeStr(d);
                            return (
                              <button
                                type="button"
                                key={iso}
                                onClick={() => picksSlot(iso)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                  selected
                                    ? "border-gold bg-gold/15 text-gold"
                                    : "border-zinc-200 text-zinc-600 hover:border-gold/60 hover:text-gold dark:border-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {localTimeStr(d)}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[12px] text-zinc-400">Sin huecos libres para este día.</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Fecha<input type="date" value={date} min={localToday()} onChange={(e) => setDate(e.target.value)} required className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 scheme-light-dark" /></label><label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Hora<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 scheme-light-dark" /><span className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400"><Clock size={11} /> Intervalos de 30 min</span></label></div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Notas<span className="sr-only"> (opcional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" /></label>
                </div>
                {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
                <button type="submit" disabled={submitting || !services.length || !barbers.length} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><Loader2 size={15} className="animate-spin" /> Registrando...</> : "Confirmar cita"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
