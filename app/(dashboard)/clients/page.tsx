"use client";
import { useEffect, useState } from "react";
import { Mail, Phone, Plus, Search, Users, X } from "lucide-react";
import { toast } from "sonner";

type Client = { id: string; name: string; phone: string | null; email: string | null; notes: string | null };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/clients");
      const json = await r.json();
      if (!r.ok || !json.success) throw new Error("No se pudieron cargar los clientes");
      setItems(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = items.filter((x) => `${x.name} ${x.phone || ""} ${x.email || ""}`.toLowerCase().includes(q.toLowerCase()));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo crear el cliente");
      setSaving(false);
      return;
    }
    setForm({ name: "", phone: "", email: "", notes: "" });
    setOpen(false);
    setSaving(false);
    toast.success("Cliente creado correctamente");
    load();
  }

  const withPhone = items.filter((client) => client.phone).length;
  const withEmail = items.filter((client) => client.email).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
            <Users size={14} /> Directorio
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Consulta y administra los datos de tus clientes.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-zinc-800">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary label="Clientes activos" value={items.length} detail="En tu directorio" />
        <Summary label="Con teléfono" value={withPhone} detail={`${items.length ? Math.round((withPhone / items.length) * 100) : 0}% del total`} />
        <Summary label="Con correo" value={withEmail} detail={`${items.length ? Math.round((withEmail / items.length) * 100) : 0}% del total`} />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 h-10 sm:w-[360px] focus-within:border-zinc-400 focus-within:bg-white">
          <Search size={16} className="text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, teléfono o correo" className="w-full bg-transparent text-sm" />
            {q && <button type="button" onClick={() => setQ("")} className="text-zinc-400 hover:text-zinc-900" aria-label="Limpiar búsqueda"><X size={15} /></button>}
          </div>
          <span className="text-xs text-zinc-500">{filtered.length} de {items.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-zinc-50/80 text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Registro</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && filtered.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50/70">
                  <td className="px-5 py-3 font-semibold flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold-light to-gold grid place-items-center text-[10px] font-bold text-zinc-950">
                      {c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                    </div>
                    <span>{c.name}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600"><span className="inline-flex items-center gap-2"><Phone size={13} className="text-zinc-400" />{c.phone || "Sin teléfono"}</span></td>
                  <td className="px-5 py-3 text-zinc-600"><span className="inline-flex items-center gap-2"><Mail size={13} className="text-zinc-400" />{c.email || "Sin correo"}</span></td>
                  <td className="px-5 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Activo</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="space-y-3 p-5">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-xl bg-zinc-100" />)}</div>}
          {error && <div className="p-10 text-center"><p className="text-sm font-medium text-zinc-700">No pudimos cargar los clientes.</p><button type="button" onClick={load} className="mt-3 text-xs font-semibold text-gold-dark hover:underline">Reintentar</button></div>}
          {!loading && !error && filtered.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">{q ? "No hay resultados para esa búsqueda." : "Sin clientes registrados."}</div>}
        </div>
      </div>
      {open && (
        <Modal title="Nuevo cliente" onClose={() => setOpen(false)} onSubmit={save} saving={saving}>
          <Field label="Nombre">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Modal({ title, onClose, onSubmit, saving, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
      <form onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex justify-between">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="mt-5 space-y-4">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border">Cancelar</button>
          <button disabled={saving} className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="text-2xl font-semibold tracking-tight">{value}</strong>
        <span className="text-[11px] text-zinc-400">{detail}</span>
      </div>
    </div>
  );
}