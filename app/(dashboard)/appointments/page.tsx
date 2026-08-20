"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarDays, Plus, RefreshCw } from "lucide-react";
import { money, initials, tzFormat } from "@/lib/format";
import UpcomingAppointmentsDialog from "@/components/upcoming-appointments-dialog";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  client: { id: string; name: string; phone: string | null };
  barber: { id: string; name: string };
  service: { id: string; name: string };
};
type AppointmentsData = { appointments: Appointment[]; timezone: string };
type SelectOption = { id: string; name: string; priceCents?: number };

const labels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};
const classes: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-indigo-50 text-indigo-700",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-zinc-100 text-zinc-600",
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = toIso(new Date());
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [timezone, setTimezone] = useState("America/Caracas");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 6));
  const [showNew, setShowNew] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);

  async function load() {
    const r = await fetch(`/api/appointments?from=${from}&to=${to}`);
    const json = await r.json();
    if (json.success) {
      const data = json.data as AppointmentsData;
      setItems(data.appointments);
      setTimezone(data.timezone);
    }
    setLoading(false);
  }

  async function loadUpcomingCount() {
    const r = await fetch("/api/appointments?upcoming=1");
    const json = await r.json();
    setUpcomingCount(json.success ? (json.data as AppointmentsData).appointments.length : 0);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/appointments?upcoming=1")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setUpcomingCount(json.success ? (json.data as AppointmentsData).appointments.length : 0);
      });
    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          const data = json.data as AppointmentsData;
          setItems(data.appointments);
          setTimezone(data.timezone);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  async function status(id: string, value: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    load();
    loadUpcomingCount();
  }

  const goToDay = (iso: string) => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : toIso(new Date(iso));
    setFrom(day);
    setTo(day);
    setShowUpcoming(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Citas</h1>
          <p className="text-sm text-zinc-500 mt-1">Agenda y controla el estado de cada servicio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowUpcoming(true)}
            className="h-10 px-4 rounded-xl border border-zinc-200 text-sm font-semibold inline-flex gap-2 items-center hover:bg-zinc-50"
          >
            <CalendarClock size={16} /> Próximas citas
            {upcomingCount > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-zinc-950 px-1.5 text-[10px] font-bold text-white">
                {upcomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold inline-flex gap-2 items-center justify-center"
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3 justify-between border-b border-zinc-100">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays size={17} /> Agenda
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-500">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 px-3 text-xs"
            />
            <label className="text-xs text-zinc-500">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 px-3 text-xs"
            />
            <button
              onClick={() => { setLoading(true); load(); }}
              className="h-9 w-9 rounded-lg border border-zinc-200 grid place-items-center"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Hora</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Servicio</th>
                <th className="px-5 py-3">Barbero</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr className="border-t border-zinc-100 text-xs" key={a.id}>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {tzFormat(a.startsAt, timezone, { weekday: "short", day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-5 py-3 font-semibold">
                    {tzFormat(a.startsAt, timezone, { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-zinc-100 grid place-items-center text-[9px] font-bold">
                        {initials(a.client.name)}
                      </div>
                      {a.client.name}
                    </div>
                  </td>
                  <td className="px-5 py-3">{a.service.name}</td>
                  <td className="px-5 py-3">{a.barber.name}</td>
                  <td className="px-5 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => status(a.id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-1 text-[9px] font-bold ${classes[a.status]}`}
                    >
                      <option value="PENDING">{labels.PENDING}</option>
                      <option value="CONFIRMED">{labels.CONFIRMED}</option>
                      <option value="COMPLETED">{labels.COMPLETED}</option>
                      <option value="CANCELLED">{labels.CANCELLED}</option>
                      <option value="NO_SHOW">{labels.NO_SHOW}</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link className="text-xs font-semibold hover:underline" href={`/appointments/${a.id}`}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500">No hay citas para este rango de fechas.</div>
          )}
        </div>
      </div>

      {showNew && <NewAppointment onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); loadUpcomingCount(); }} />}
      {showUpcoming && <UpcomingAppointmentsDialog onClose={() => setShowUpcoming(false)} onGoToDay={goToDay} />}
    </div>
  );
}

function NewAppointment({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [barbers, setBarbers] = useState<SelectOption[]>([]);
  const [services, setServices] = useState<SelectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    barberId: "",
    serviceId: "",
    startsAt: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  useEffect(() => {
    Promise.all([fetch("/api/clients"), fetch("/api/barbers"), fetch("/api/services")])
      .then(async ([c, b, s]) => {
        const [cj, bj, sj] = await Promise.all([c.json(), b.json(), s.json()]);
        setClients(cj.success ? cj.data : []);
        setBarbers(bj.success ? bj.data : []);
        setServices(sj.success ? sj.data : []);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) onSaved();
    else {
      const json = await r.json();
      alert(json.error?.message || "Error");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
      <form
        onSubmit={save}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <h2 className="font-semibold text-lg">Nueva cita</h2>
            <p className="text-xs text-zinc-500 mt-1">Reserva un horario para un cliente.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400">×</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label="Cliente">
            <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Seleccionar...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Barbero">
            <select required value={form.barberId} onChange={(e) => setForm({ ...form, barberId: e.target.value })}>
              <option value="">Seleccionar...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Servicio">
            <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Seleccionar...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {money(s.priceCents ?? 0)}</option>
              ))}
            </select>
          </Field>
          <Field label="Inicio">
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </Field>
          <Field label="Notas" wide>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6 border-t pt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-zinc-200 text-sm">
            Cancelar
          </button>
          <button disabled={saving} className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold">
            {saving ? "Guardando..." : "Guardar cita"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`${wide ? "sm:col-span-2 " : ""}text-xs font-medium text-zinc-700`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}