"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  Mail,
  Phone,
  Scissors,
  UserRound,
  X,
} from "lucide-react";
import { money, initials } from "@/lib/format";
import {
  useBookingWizard,
  type BookingService,
  type BookingBarber,
} from "./use-booking-wizard";

function Stepper({ current }: { current: number }) {
  const labels = ["Elige cómo", "Tus datos", "Servicio", "Barbero", "Confirma"];
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
                done ? "bg-gold text-zinc-950" : active ? "border border-gold text-gold" : "border border-white/15 text-zinc-400"
              }`}
            >
              {done ? <Check size={12} /> : n}
            </div>
            <span className={`whitespace-nowrap text-[11px] ${active ? "text-gold" : done ? "text-zinc-400" : "text-zinc-400"}`}>
              {label}
            </span>
            {n < labels.length && <div className={`h-px w-6 sm:w-10 ${done ? "bg-gold/50" : "bg-white/10"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function dayLabelLocal(dayStr: string): string {
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const localDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = today();
  if (dayStr === t) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayStr === localDateStr(tomorrow)) return "Mañana";
  return new Date(`${dayStr}T00:00:00`).toLocaleDateString("es-VE", { weekday: "short", day: "numeric" });
}

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const localTimeStr = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function BookingDialog({
  services,
  barbers,
  currency,
}: {
  services: BookingService[];
  barbers: BookingBarber[];
  currency: string;
}) {
  const {
    state,
    dialogRef,
    quickReady,
    days,
    activeSlots,
    stepIndex,
    selectedService,
    goTo,
    close,
    setContact,
    setDate,
    setTime,
    setActiveDay,
    selectService,
    selectBarber,
    lookupReturning,
    setReturning,
    holdSlot,
    submit,
  } = useBookingWizard({ services });

  if (!state.open) return null;

  const { step, serviceId, barberId, name, email, phone, date, time, submitting, error, result, activeDay, returning } = state;

  const selectedBarber = barbers.find((b) => b.id === barberId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        aria-describedby="booking-desc"
        className="relative min-w-0 w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,var(--gold-glow-18),transparent_70%)]" />
        <button
          type="button"
          aria-label="Cerrar"
          onClick={close}
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
              <p id="booking-desc" className="mt-1 text-[13px] leading-5 text-zinc-400">
                ¿Cómo prefieres continuar? Reservar es gratis y rápido.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => goTo("datos")}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-left transition-colors hover:bg-gold/20"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-zinc-950">
                    <UserRound size={17} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gold">Continuar como invitado</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      Sin registro. Solo necesitas tu nombre, tu correo y tu teléfono.
                    </div>
                  </div>
                </button>

                <Link
                  href="/login"
                  onClick={close}
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

              <p className="mt-5 text-center text-[11px] text-zinc-400">
                Al reservar aceptas que te contactemos para confirmar tu cita.
              </p>
            </div>
          )}

          {step === "datos" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim() && email.trim()) goTo(serviceId && barberId ? "details" : "services");
              }}
            >
              <button
                type="button"
                onClick={() => goTo(serviceId || barberId ? "barber" : "choice")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Tus datos
              </h2>
              <p id="booking-desc" className="mt-1 text-[13px] leading-5 text-zinc-400">
                Solo necesitamos tus datos de contacto para confirmar tu cita.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Nombre *</span>
                  <input
                    value={name}
                    onChange={(e) => setContact(e.target.value, email, phone)}
                    required
                    placeholder="Tu nombre"
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-400 focus:border-gold/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Correo *</span>
                  <input
                    value={email}
                    onChange={(e) => {
                      setContact(name, e.target.value, phone);
                      setReturning(null);
                    }}
                    onBlur={() => lookupReturning(email)}
                    type="email"
                    required
                    placeholder="tucorreo@ejemplo.com"
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-400 focus:border-gold/50"
                  />
                </label>
              </div>
              {returning?.exists && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gold">
                  <UserRound size={13} /> Ya te conocemos, {returning.name ?? "bienvenido de nuevo"}.
                </p>
              )}
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Teléfono (opcional)</span>
                <input
                  value={phone}
                  onChange={(e) => setContact(name, email, e.target.value)}
                  type="tel"
                  placeholder="+58 412 000 0000"
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-400 focus:border-gold/50"
                />
              </label>

              <button
                type="submit"
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light"
              >
                Continuar <ArrowLeft size={14} className="rotate-180" />
              </button>
            </form>
          )}

          {step === "services" && (
            <div>
              <button
                type="button"
                onClick={() => goTo(barberId ? "barber" : "choice")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Elige tu servicio
              </h2>
              <p id="booking-desc" className="mt-1 text-[13px] leading-5 text-zinc-400">
                Toca una opción para continuar. Precios en {currency}.
              </p>

              {selectedBarber && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold">
                  <UserRound size={12} /> Barbero: {selectedBarber.name}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service, i) => {
                  const selected = serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => selectService(service.id)}
                      className={`group relative flex h-full flex-col rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                        selected
                          ? "border-gold bg-gold/10"
                          : "border-white/10 bg-white/[0.02] hover:border-gold/40 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-[11px] font-semibold transition-colors ${
                            selected ? "bg-gold text-zinc-950" : "border border-gold/30 bg-gold/10 text-gold"
                          }`}
                        >
                          {selected ? <Check size={13} /> : String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="whitespace-nowrap font-display text-sm font-semibold text-gold">
                          {money(service.priceCents, currency)}
                        </span>
                      </div>
                      <div className="mt-2.5 flex-1">
                        <div className="font-display text-sm font-semibold tracking-tight text-white">{service.name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <Clock size={11} /> {service.durationMin} min
                        </div>
                        {service.description && (
                          <div className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-zinc-400">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!serviceId}
                onClick={() => goTo(barberId ? (name.trim() && email.trim() ? "details" : "datos") : "barber")}
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
                onClick={() => goTo("services")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Elige tu barbero
              </h2>
              <p id="booking-desc" className="mt-1 text-[13px] leading-5 text-zinc-400">
                Tu barbero de confianza. Toca una opción para continuar.
              </p>

              {selectedService ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-zinc-950">
                    <Scissors size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{selectedService.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock size={12} /> {selectedService.durationMin} min · {money(selectedService.priceCents, currency)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goTo("services")}
                    className="shrink-0 text-[11px] font-medium text-gold transition-colors hover:text-gold-light"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo("services")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-gold/40 hover:text-gold"
                >
                  <Scissors size={15} /> Elige tu servicio
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              )}

              <span className="mt-4 block text-[11px] uppercase tracking-[0.2em] text-zinc-400">Barbero *</span>
              <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {barbers.map((barber) => {
                  const selected = barberId === barber.id;
                  return (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => selectBarber(barber.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        selected ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-xs font-semibold text-zinc-950">
                        {initials(barber.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{barber.name}</div>
                        {barber.specialty && <div className="truncate text-xs text-zinc-400">{barber.specialty}</div>}
                      </div>
                      {selected && <Check size={15} className="shrink-0 text-gold" />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!barberId || !serviceId}
                onClick={() => goTo(name.trim() && email.trim() ? "details" : "datos")}
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
                onClick={() => goTo("barber")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-gold"
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <h2 id="booking-title" className="mt-3 font-display text-2xl font-semibold uppercase tracking-tight">
                Confirma tu cita
              </h2>
              <p id="booking-desc" className="mt-1 text-[13px] leading-5 text-zinc-400">
                Revisa el resumen y elige el día y la hora.
              </p>

              <div className="mt-4 space-y-2.5 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm">
                {selectedService && (
                  <div className="flex items-center gap-3">
                    <Scissors size={15} className="shrink-0 text-gold" />
                    <span className="text-zinc-200">{selectedService.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-400">
                      {selectedService.durationMin} min · {money(selectedService.priceCents, currency)}
                    </span>
                  </div>
                )}
                {selectedBarber && (
                  <div className="flex items-center gap-3">
                    <UserRound size={15} className="shrink-0 text-gold" />
                    <span className="text-zinc-200">{selectedBarber.name}</span>
                    {selectedBarber.specialty && (
                      <span className="ml-auto shrink-0 text-xs text-zinc-400">{selectedBarber.specialty}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Datos de contacto</span>
                  <button
                    type="button"
                    onClick={() => goTo("datos")}
                    className="text-[11px] font-medium text-gold transition-colors hover:text-gold-light"
                  >
                    Editar
                  </button>
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <UserRound size={14} className="shrink-0 text-gold" />
                    <span className="break-words">{name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={14} className="shrink-0 text-gold" />
                    <span className="break-words">{email}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone size={14} className="shrink-0 text-gold" />
                      <span className="break-words">{phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {barberId && (
                <div className="mt-4">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
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
                        {dayLabelLocal(day)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!quickReady ? (
                      <span className="text-[12px] text-zinc-400">Buscando disponibilidad…</span>
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
                      <span className="text-[12px] text-zinc-400">Sin huecos libres para este día.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Fecha *</span>
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
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Hora *</span>
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
                onClick={close}
                className="mt-6 h-11 w-full rounded-full bg-gold text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-light"
              >
                Listo
              </button>
            </div>
          )}
        </div>

        {/* #4 — Resumen de precio fijo */}
        {selectedService && step !== "success" && (
          <div className="relative border-t border-white/10 bg-zinc-950/90 px-6 py-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Total</div>
                <div className="truncate text-[13px] text-zinc-300">{selectedService.name}</div>
              </div>
              <div className="shrink-0 font-display text-lg font-semibold text-gold">
                {money(selectedService.priceCents, currency)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
