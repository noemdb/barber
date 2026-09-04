"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, CalendarDays, Check, ChevronDown, Plus, RefreshCw } from "lucide-react";
import { money, initials, tzFormat } from "@/lib/format";
import UpcomingAppointmentsDialog from "@/components/upcoming-appointments-dialog";
import AppointmentDetailDialog from "@/components/appointment-detail-dialog";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  notes?: string | null;
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
  PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};
const selectCls =
  "h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100";

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
  const [services, setServices] = useState<SelectOption[]>([]);
  const [barbers, setBarbers] = useState<SelectOption[]>([]);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [detail, setDetail] = useState<Appointment | null>(null);

  const qsOf = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (filterStatus && filterStatus !== "ALL") params.set("status", filterStatus);
    if (serviceId) params.set("service", serviceId);
    if (barberId) params.set("barber", barberId);
    return params.toString();
  }, [from, to, filterStatus, serviceId, barberId]);

  const hasFilters = filterStatus !== "ALL" || !!serviceId || !!barberId;

  async function load() {
    const r = await fetch(`/api/appointments?${qsOf()}`);
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
    fetch(`/api/appointments?${qsOf()}`)
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
  }, [qsOf]);

  useEffect(() => {
    Promise.all([fetch("/api/services"), fetch("/api/barbers")])
      .then(async ([s, b]) => {
        const [sj, bj] = await Promise.all([s.json(), b.json()]);
        setServices(sj.success ? sj.data : []);
        setBarbers(bj.success ? bj.data : []);
      });
  }, []);

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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Citas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Agenda y controla el estado de cada servicio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowUpcoming(true)}
            className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold inline-flex gap-2 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <CalendarClock size={16} /> Próximas citas
            {upcomingCount > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-zinc-950 dark:bg-gold px-1.5 text-[10px] font-bold text-white dark:text-zinc-950">
                {upcomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold inline-flex gap-2 items-center justify-center hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors"
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3 justify-between border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <CalendarDays size={17} /> Agenda
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
            />
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={selectCls}
              aria-label="Estado de la cita"
            >
              <option value="ALL">Todos los estados</option>
              <option value="PENDING">{labels.PENDING}</option>
              <option value="CONFIRMED">{labels.CONFIRMED}</option>
              <option value="COMPLETED">{labels.COMPLETED}</option>
              <option value="CANCELLED">{labels.CANCELLED}</option>
              <option value="NO_SHOW">{labels.NO_SHOW}</option>
            </select>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={selectCls}
              aria-label="Servicio"
            >
              <option value="">Todos los servicios</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className={selectCls}
              aria-label="Barbero"
            >
              <option value="">Todos los barberos</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setFilterStatus("ALL"); setServiceId(""); setBarberId(""); }}
                className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={() => { setLoading(true); load(); }}
              className="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 grid place-items-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Fecha</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Hora</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Cliente</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Servicio</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Barbero</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Estado</th>
                <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Total</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr className="border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100" key={a.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {tzFormat(a.startsAt, timezone, { weekday: "short", day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-600 dark:text-zinc-400">
                    {tzFormat(a.startsAt, timezone, { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
                        {initials(a.client.name)}
                      </div>
                      {a.client.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.service.name}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{a.barber.name}</td>
                  <td className="px-5 py-3">
                    <StatusMenu value={a.status} onChange={(v) => status(a.id, v)} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(a.priceCents)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(a)}
                      className="text-xs font-semibold hover:underline text-zinc-600 dark:text-zinc-400"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay citas para este rango de fechas.</div>
          )}
        </div>
      </div>

      {showNew && <NewAppointment onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); loadUpcomingCount(); }} />}
      {showUpcoming && <UpcomingAppointmentsDialog onClose={() => setShowUpcoming(false)} onGoToDay={goToDay} />}
      {detail && <AppointmentDetailDialog appointment={detail} timezone={timezone} onClose={() => setDetail(null)} />}
    </div>
  );
}

const STATUS_MENU_WIDTH = 144; // w-36

function StatusMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: r.right - STATUS_MENU_WIDTH });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1 rounded-full border-0 px-2 py-1 text-[9px] font-bold cursor-pointer ${classes[value]}`}
      >
        {labels[value] ?? value}
        <ChevronDown size={9} strokeWidth={3} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left, width: STATUS_MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {Object.entries(labels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span>{label}</span>
              {key === value && <Check size={12} className="text-gold" />}
            </button>
          ))}
        </div>
      )}
    </>
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
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
      <form
        onSubmit={save}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex justify-between">
          <div>
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Nueva cita</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Reserva un horario para un cliente.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xl">×</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label="Cliente">
            <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
              <option value="">Seleccionar...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Barbero">
            <select required value={form.barberId} onChange={(e) => setForm({ ...form, barberId: e.target.value })} className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
              <option value="">Seleccionar...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Servicio">
            <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
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
              className="w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
            />
          </Field>
          <Field label="Notas" wide>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 resize-none min-h-[80px]" />
          </Field>
        </div>
        <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button disabled={saving} className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cita"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`${wide ? "sm:col-span-2 " : ""}text-xs font-medium text-zinc-700 dark:text-zinc-300`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}