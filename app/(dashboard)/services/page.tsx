"use client";
import { useEffect, useState } from "react";
import { Plus, Clock3 } from "lucide-react";
import { money } from "@/lib/format";

type Service = { id: string; name: string; description: string | null; durationMin: number; priceCents: number };

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", durationMin: "30", price: "15" });

  async function load() {
    const r = await fetch("/api/services");
    const json = await r.json();
    setItems(json.success ? json.data : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setItems(json.success ? json.data : []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMin: Number(form.durationMin), priceCents: Math.round(Number(form.price) * 100) }),
    });
    if (!r.ok) {
      const json = await r.json();
      alert(json.error?.message || "Error");
      return;
    }
    setOpen(false);
    setForm({ name: "", description: "", durationMin: "30", price: "15" });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Servicios</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Catálogo, duración y precios.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 rounded-xl text-sm font-semibold flex gap-2 items-center hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex justify-between">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-zinc-600 dark:text-zinc-400">
                <Clock3 size={17} />
              </div>
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-1 h-fit font-bold">Activo</span>
            </div>
            <h2 className="mt-5 font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 h-8">{s.description || "Servicio profesional"}</p>
            <div className="mt-5 flex justify-between text-xs text-zinc-900 dark:text-zinc-100">
              <span className="text-zinc-500 dark:text-zinc-400">{s.durationMin} min</span>
              <strong>{money(s.priceCents)}</strong>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin servicios registrados.</div>}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 grid place-items-center p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <form onSubmit={save} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Nuevo servicio</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre
                <input required className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Descripción
                <input className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Duración
                  <input type="number" className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
                </label>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Precio
                  <input type="number" step="0.01" className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}