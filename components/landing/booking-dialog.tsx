"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  Scissors,
  UserRound,
  X,
} from "lucide-react";
import { money, initials } from "@/lib/format";

type BookingService = { id: string; name: string; description: string | null; durationMin: number; priceCents: number };
type BookingBarber = { id: string; name: string; specialty: string | null };
type CreatedAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  service: { name: string };
  barber: { name: string };
  client: { name: string };
};

type Step = "choice" | "services" | "barber" | "details" | "success";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const localTimeStr = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function newHoldToken() {
  try {
    return crypto.randomUUID();
  } catch {
    return `hold_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

// Los próximos 3 días (incluido hoy) en formato local YYYY-MM-DD.
function next3Days(): string[] {
  return [0, 1, 2].map((n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return localDateStr(d);
  });
}

function dayLabel(dayStr: string): string {
  const today = localDateStr(new Date());
  if (dayStr === today) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayStr === localDateStr(tomorrow)) return "Mañana";
  return new Date(`${dayStr}T00:00:00`).toLocaleDateString("es-VE", { weekday: "short", day: "numeric" });
}

function Stepper({ current }: { current: number }) {
  const labels = ["Elige cómo", "Servicio", "Barbero", "Confirma"];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                done ? "bg-gold text-zinc-950" : active ? "border border-gold text-gold" : "border border-white/15 text-zinc-500"
              }`}
            >
              {done ? <Check size={12} /> : n}
            </div>
            <span className={`whitespace-nowrap text-[11px] ${active ? "text-gold" : done ? "text-zinc-400" : "text-zinc-600"}`}>
              {label}
            </span>
            {n < labels.length && <div className={`h-px w-6 sm:w-10 ${done ? "bg-gold/50" : "bg-white/10"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingDialog({
  services,
  barbers,
  currency,
}: {
  services: BookingService[];
  barbers: BookingBarber[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choice");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreatedAppointment | null>(null);
  const [quick, setQuick] = useState<{ barberId: string; token: string; slotsByDay: Record<string, string[]> }>({
    barberId: "",
    token: "",
    slotsByDay: {},
  });
  const [activeDay, setActiveDay] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [holdToken, setHoldToken] = useState<string>(() => newHoldToken());

  useEffect(() => {
    const openDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ serviceId?: string; barberId?: string }>).detail;
      const serviceId = detail?.serviceId ?? "";
      const barberId = detail?.barberId ?? "";
      // Servicio o barbero elegido desde el landing → aterrizar en el paso Barbero
      // (con la selección ya tomada). Si viene el barbero, se muestra un aviso para
      // elegir el servicio; la selección de barbero queda tomada en cuenta.
      const step: Step = serviceId || barberId ? "barber" : "choice";
      setStep(step);
      setServiceId(serviceId);
      setBarberId(barberId);
      setName("");
      setEmail("");
      setDate("");
      setTime("");
      setError("");
      setResult(null);
      setHoldToken(newHoldToken());
      setActiveDay("");
      setRefreshKey(0);
      setQuick({ barberId: "", token: "", slotsByDay: {} });
      setOpen(true);
    };
    window.addEventListener("barber:open-booking", openDialog);
    return () => window.removeEventListener("barber:open-booking", openDialog);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!barberId) return;
    let cancelled = false;
    const service = services.find((s) => s.id === serviceId);
    const serviceDurationMin = service?.durationMin;
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 3);
    to.setHours(23, 59, 59, 999);
    const token = holdToken;
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), token });
    if (serviceDurationMin) qs.set("durationMin", String(serviceDurationMin));
    fetch(`/api/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const barbers = (json.data?.barbers ?? []) as Array<{ id?: string; freeSlots?: string[] }>;
        const barber = barbers.find((b) => b?.id === barberId);
        const slotsByDay: Record<string, string[]> = {};
        for (const iso of barber?.freeSlots ?? []) {
          const day = localDateStr(new Date(iso));
          (slotsByDay[day] ??= []).push(iso);
        }
        setQuick({ barberId, token, slotsByDay });
        setActiveDay((prev) => prev || localDateStr(new Date()));
      })
      .catch(() => {
        if (!cancelled) setQuick({ barberId, token, slotsByDay: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [barberId, serviceId, services, refreshKey, holdToken]);

  const quickReady = quick.barberId === barberId && !!barberId && quick.token === holdToken;
  const days = next3Days();
  const activeSlots = quickReady ? quick.slotsByDay[activeDay] ?? [] : [];

  const stepIndex = step === "choice" ? 1 : step === "services" ? 2 : step === "barber" ? 3 : step === "details" ? 4 : 5;

  function holdSlot(startsAtIso: string) {
    const token = holdToken;
    const service = services.find((s) => s.id === serviceId);
    const dur = service?.durationMin ?? 30;
    fetch("/api/availability/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, startsAt: startsAtIso, durationMin: dur, token }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setError(j?.error?.message ?? "Ese horario acaba de ser reservado por otra persona");
          setRefreshKey((k) => k + 1);
        }
      })
      .catch(() => {});
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!serviceId || !barberId) {
      setError("Selecciona un servicio y un barbero");
      return;
    }
    if (!date || !time) {
      setError("Selecciona fecha y hora");
      return;
    }
    const startsAt = new Date(`${date}T${time}:00`);
    if (startsAt <= new Date()) {
      setError("La fecha y hora deben ser futuras");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          serviceId,
          barberId,
          startsAt: startsAt.toISOString(),
          holdToken: holdToken ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message ?? "No fue posible reservar");
      setResult(data.data);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible reservar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative min-w-0 w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,var(--gold-glow-18),transparent_70%)]" />
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:text-white"
        >
          <X size={15} />
        </button>

        <div className="relative max-h-[min(85vh,640px)] overflow-y-auto p-6">
          <Stepper current={stepIndex} />

          {step === "choice" && (
            <div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                <Scissors size={18} />
              </div>
              <h2 id="booking-title" className="mt-4 font-display text-2xl font-semibold uppercase tracking-tight">
                Reserva tu cita
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                ¿Cómo prefieres continuar? Reservar es gratis y rápido.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setStep("services")}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-left transition-colors hover:bg-gold/20"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-zinc-950">
                    <UserRound size={17} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gold">Continuar como invitado</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      Sin registro. Solo necesitas tu nombre y tu correo.
                    </div>
                  </div>
                </button>

                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 p-4 text-left transition-colors hover:border-white/30"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-300">
                    <LogIn size={17} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Iniciar sesión</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      Accede a tu cuenta para gestionar tu historial y reservas.
                    </div>
                  </div>
                </Link>
              </div>

              <p className="mt-5 text-center text-[11px] text-zinc-500">
                Al reservar aceptas que te contactemos para confirmar tu cita.
              </p>
            </div>
          )}

          {step === "services" && (
            <div>
              <button
                type="button"
                onClick={() => setStep(barberId ? "barber" : "choice")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Elige tu servicio
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                Toca una opción para continuar. Precios en {currency}.
              </p>

              {(() => {
                const barber = barbers.find((b) => b.id === barberId);
                if (!barber) return null;
                return (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold">
                    <UserRound size={12} /> Barbero: {barber.name}
                  </div>
                );
              })()}

              <div className="mt-4 space-y-2.5">
                {services.map((service, i) => {
                  const selected = serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setServiceId(service.id);
                        setStep(barberId ? "details" : "barber");
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                        selected ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-xs font-semibold ${
                          selected ? "bg-gold text-zinc-950" : "border border-gold/30 bg-gold/10 text-gold"
                        }`}
                      >
                        {selected ? <Check size={15} /> : String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{service.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                          <Clock size={12} /> {service.durationMin} min
                        </div>
                        {service.description && (
                          <div className="mt-0.5 text-xs text-zinc-500">{service.description}</div>
                        )}
                      </div>
                      <div className="whitespace-nowrap font-display text-base font-semibold text-gold">
                        {money(service.priceCents, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!serviceId}
                onClick={() => setStep(barberId ? "details" : "barber")}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          )}

          {step === "barber" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("services")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Elige tu barbero
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                Tu barbero de confianza. Toca una opción para continuar.
              </p>

              {selectedService ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-zinc-950">
                    <Scissors size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{selectedService.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock size={12} /> {selectedService.durationMin} min · {money(selectedService.priceCents, currency)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("services")}
                    className="shrink-0 text-[11px] font-medium text-gold transition-colors hover:text-gold-light"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep("services")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-gold/40 hover:text-gold"
                >
                  <Scissors size={15} /> Elige tu servicio
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              )}

              <span className="mt-4 block text-[11px] uppercase tracking-[0.2em] text-zinc-500">Barbero *</span>
              <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {barbers.map((barber) => {
                  const selected = barberId === barber.id;
                  return (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => {
                        setBarberId(barber.id);
                        if (serviceId) setStep("details");
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        selected ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-xs font-semibold text-zinc-950">
                        {initials(barber.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{barber.name}</div>
                        {barber.specialty && (
                          <div className="truncate text-xs text-zinc-500">{barber.specialty}</div>
                        )}
                      </div>
                      {selected && <Check size={15} className="shrink-0 text-gold" />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!barberId || !serviceId}
                onClick={() => setStep("details")}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          )}

          {step === "details" && (
            <form onSubmit={submit}>
              <button
                type="button"
                onClick={() => setStep("barber")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Confirma tu cita
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                Revisa el resumen y elige el día y la hora. Solo necesitamos tus datos de contacto.
              </p>

              <div className="mt-4 space-y-2.5 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
                {selectedService && (
                  <div className="flex items-center gap-3">
                    <Scissors size={15} className="shrink-0 text-gold" />
                    <span className="text-zinc-200">{selectedService.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-500">
                      {selectedService.durationMin} min · {money(selectedService.priceCents, currency)}
                    </span>
                  </div>
                )}
                {(() => {
                  const barber = barbers.find((b) => b.id === barberId);
                  if (!barber) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <UserRound size={15} className="shrink-0 text-gold" />
                      <span className="text-zinc-200">{barber.name}</span>
                      {barber.specialty && <span className="ml-auto shrink-0 text-xs text-zinc-500">{barber.specialty}</span>}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Nombre *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tu nombre"
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-gold/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Correo *</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="tucorreo@ejemplo.com"
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-gold/50"
                  />
                </label>
              </div>

              {barberId && (
                <div className="mt-4">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Horarios disponibles · próximos 3 días
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {days.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setActiveDay(day)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          activeDay === day ? "border-gold bg-gold/15 text-gold" : "border-white/10 text-zinc-300 hover:border-gold/50 hover:text-gold"
                        }`}
                      >
                        {dayLabel(day)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!quickReady ? (
                      <span className="text-[12px] text-zinc-500">Buscando disponibilidad…</span>
                    ) : activeSlots.length > 0 ? (
                      activeSlots.map((iso) => {
                        const d = new Date(iso);
                        const selected = time === localTimeStr(d);
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => {
                              setDate(localDateStr(d));
                              setTime(localTimeStr(d));
                              holdSlot(iso);
                            }}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "border-gold bg-gold/15 text-gold"
                                : "border-white/10 text-zinc-300 hover:border-gold/50 hover:text-gold"
                            }`}
                          >
                            {localTimeStr(d)}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-[12px] text-zinc-500">Sin huecos libres para este día.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Fecha *</span>
                  <input
                    type="date"
                    value={date}
                    min={localToday()}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/50 [color-scheme:dark]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Hora *</span>
                  <input
                    type="time"
                    value={time}
                    step={1800}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/50 [color-scheme:dark]"
                  />
                </label>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Reservando…
                  </>
                ) : (
                  <>
                    <Calendar size={15} /> Confirmar reserva
                  </>
                )}
              </button>
            </form>
          )}

          {step === "success" && result && (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
                <CheckCircle2 size={26} />
              </div>
              <h2 id="booking-title" className="mt-4 font-display text-2xl font-semibold uppercase tracking-tight">
                ¡Cita reservada!
              </h2>
              <p className="mt-1 text-[13px] text-zinc-400">
                Te contactaremos para confirmar. Puedes ver los detalles a continuación.
              </p>
              <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Scissors size={15} className="text-gold" />
                  <span className="text-zinc-300">{result.service.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <UserRound size={15} className="text-gold" />
                  <span className="text-zinc-300">{result.barber.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-gold" />
                  <span className="text-zinc-300">
                    {new Intl.DateTimeFormat("es-VE", { dateStyle: "full", timeStyle: "short" }).format(
                      new Date(result.startsAt),
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={15} className="text-gold" />
                  <span className="text-zinc-300">
                    Estado: <span className="text-gold">Pendiente de confirmación</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 h-11 w-full rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
