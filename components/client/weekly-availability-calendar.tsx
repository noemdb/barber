"use client";

import Image from "next/image";
import { useState } from "react";
import { CalendarDays, Check, Clock3 } from "lucide-react";

type Barber = { id: string; name: string; avatar: string | null };
type Appointment = { id: string; barberId: string; serviceName: string; startsAt: string; endsAt: string };
type BusinessHour = { dayOfWeek: number; openTime: string | null; closeTime: string | null };

type Props = {
  weekStart: string;
  timezone: string;
  barbers: Barber[];
  appointments: Appointment[];
  businessHours: BusinessHour[];
};

const dayFormatter = new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return dayFormatter.format(new Date(`${date}T00:00:00Z`)).replace(".", "");
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(totalMinutes: number) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function appointmentLocalParts(appointment: Appointment, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
  const start = Object.fromEntries(formatter.formatToParts(new Date(appointment.startsAt)).map((part) => [part.type, part.value]));
  const end = Object.fromEntries(formatter.formatToParts(new Date(appointment.endsAt)).map((part) => [part.type, part.value]));
  return {
    date: `${start.year}-${start.month}-${start.day}`,
    startMinutes: Number(start.hour) * 60 + Number(start.minute),
    endMinutes: Number(end.hour) * 60 + Number(end.minute),
  };
}

export function WeeklyAvailabilityCalendar({ weekStart, timezone, barbers, appointments, businessHours }: Props) {
  const [open, setOpen] = useState(false);
  const [barberFilter, setBarberFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const visibleBarbers = barberFilter === "ALL" ? barbers : barbers.filter((barber) => barber.id === barberFilter);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const hours = new Map(businessHours.map((hour) => [hour.dayOfWeek, hour]));
  const configuredTimes = businessHours.flatMap((hour) => [hour.openTime, hour.closeTime]).filter((time): time is string => Boolean(time));
  const firstSlot = configuredTimes.length ? Math.min(...configuredTimes.map(minutes)) : 0;
  const lastSlot = configuredTimes.length ? Math.max(...configuredTimes.map(minutes)) : 0;
  const slotMinutes = Array.from({ length: Math.max(0, Math.ceil((lastSlot - firstSlot) / 30)) }, (_, index) => index * 30 + firstSlot);
  const shiftStart = shiftFilter === "AFTERNOON" ? 12 * 60 : 0;
  const shiftEnd = shiftFilter === "MORNING" ? 12 * 60 : 24 * 60;
  const visibleSlots = slotMinutes.filter((slot) => slot >= shiftStart && slot < shiftEnd && days.some((day) => {
    const dayOfWeek = new Date(`${day}T12:00:00Z`).getUTCDay();
    const hour = hours.get(dayOfWeek);
    return hour?.openTime && hour.closeTime && slot >= minutes(hour.openTime) && slot < minutes(hour.closeTime);
  }));
  const appointmentsByBarber = new Map(visibleBarbers.map((barber) => [barber.id, appointments.filter((appointment) => appointment.barberId === barber.id)]));

  function selectSlot(day: string, slot: number, barberId: string) {
    window.dispatchEvent(new CustomEvent("barber:open-booking", {
      detail: { date: day, time: timeLabel(slot), barberId },
    }));
  }

  const calendar = (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100"><CalendarDays size={17} className="text-gold-dark dark:text-gold" /><h2 className="font-semibold">Indisponibilidad semanal</h2></div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Las celdas ocupadas muestran citas confirmadas. Selecciona un espacio libre para registrar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)} aria-label="Filtrar por barbero" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            <option value="ALL">Todos los barberos</option>
            {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)} aria-label="Filtrar por horario" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            <option value="ALL">Todo el día</option>
            <option value="MORNING">Mañana</option>
            <option value="AFTERNOON">Tarde</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Libre <span className="ml-2 h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" /> No disponible</div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-245 p-4">
          <div className="grid grid-cols-[64px_repeat(7,minmax(125px,1fr))] border-l border-t border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-r border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"><Clock3 size={14} className="text-zinc-400" /></div>
            {days.map((day) => <div key={day} className="border-b border-r border-zinc-200 bg-zinc-50 p-2 text-center text-xs font-semibold capitalize text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">{formatDate(day)}</div>)}
            {visibleSlots.length === 0 && <div className="col-span-8 p-8 text-center text-sm text-zinc-500">No hay horarios configurados para esta semana.</div>}
            {visibleSlots.map((slot) => (
              <div key={slot} className="contents">
                <div className="border-b border-r border-zinc-200 px-2 py-2 text-[10px] font-semibold text-zinc-400 dark:border-zinc-800">{timeLabel(slot)}</div>
                {days.map((day) => {
                  const dayOfWeek = new Date(`${day}T12:00:00Z`).getUTCDay();
                  const hour = hours.get(dayOfWeek);
                  const inBusinessHours = Boolean(hour?.openTime && hour.closeTime && slot >= minutes(hour.openTime) && slot < minutes(hour.closeTime));
                  return <div key={`${day}-${slot}`} className="min-h-18 border-b border-r border-zinc-200 p-1 dark:border-zinc-800">
                    {inBusinessHours && <div className="grid grid-cols-2 gap-1">
                    {visibleBarbers.map((barber) => {
                      const appointment = appointmentsByBarber.get(barber.id)?.find((candidate) => {
                        const local = appointmentLocalParts(candidate, timezone);
                        return local.date === day && slot >= local.startMinutes && slot < local.endMinutes;
                      });
                      return appointment ? (
                        <div key={barber.id} title={`${barber.name}: no disponible`} className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                          <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200"><Check size={11} className="text-zinc-400" />
                            {barber.avatar ? <Image src={barber.avatar} alt="" width={18} height={18} className="h-4.5 w-4.5 rounded-full object-cover" /> : <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-zinc-300 text-[8px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{barber.name.charAt(0).toUpperCase()}</span>}
                          </div>
                        </div>
                      ) : (
                        <button key={barber.id} type="button" onClick={() => selectSlot(day, slot, barber.id)} className="aspect-square flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-1 text-left text-[10px] text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60" title={`Registrar con ${barber.name}`} aria-label={`Registrar cita con ${barber.name} el ${day} a las ${timeLabel(slot)}`}>
                          {barber.avatar ? <Image src={barber.avatar} alt="" width={22} height={22} className="h-5.5 w-5.5 rounded-full object-cover" /> : <span className="grid h-5.5 w-5.5 place-items-center rounded-full bg-emerald-200 text-[8px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{barber.name.charAt(0).toUpperCase()}</span>}
                        </button>
                      );
                    })}
                    </div>}
                  </div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-zinc-100 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Zona horaria: {timezone} · Los espacios libres se validan nuevamente al confirmar.</div>
    </section>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
        <CalendarDays size={15} /> Ver indisponibilidad semanal
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="weekly-availability-title" className="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto">
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar calendario" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-500 shadow dark:bg-zinc-900 dark:text-zinc-300">×</button>
            <div id="weekly-availability-title" className="sr-only">Indisponibilidad semanal</div>
            {calendar}
          </div>
        </div>
      )}
    </>
  );
}
