"use client";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

type Client = { id: string; name: string; phone: string | null; email: string | null; notes: string | null };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  async function load() {
    const r = await fetch("/api/clients");
    const json = await r.json();
    setItems(json.success ? json.data : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setItems(json.success ? json.data : []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = items.filter((x) => `${x.name} ${x.phone || ""} ${x.email || ""}`.toLowerCase().includes(q.toLowerCase()));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const json = await r.json();
      alert(json.error?.message || "Error");
      return;
    }
    setForm({ name: "", phone: "", email: "", notes: "" });
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Base de clientes de la barbería.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold flex items-center justify-center gap-2">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Search size={16} className="text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o correo" className="w-full text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-400">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Correo</th>
                <th className="px-5 py-3">Registro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-5 py-3 font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 grid place-items-center text-[9px]">
                      {c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                    </div>
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{c.phone || "—"}</td>
                  <td className="px-5 py-3 text-zinc-600">{c.email || "—"}</td>
                  <td className="px-5 py-3 text-zinc-600">Cliente activo</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">Sin clientes.</div>}
        </div>
      </div>
      {open && (
        <Modal title="Nuevo cliente" onClose={() => setOpen(false)} onSubmit={save}>
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

function Modal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode }) {
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
          <button className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold">Guardar</button>
        </div>
      </form>
    </div>
  );
}