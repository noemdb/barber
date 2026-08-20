"use client";
import { useEffect, useState } from "react";
import { Plus, Scissors } from "lucide-react";

type Barber = { id: string; name: string; phone: string | null; email: string | null; specialty: string | null };

export default function BarbersPage() {
  const [items, setItems] = useState<Barber[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", specialty: "" });

  async function load() {
    const r = await fetch("/api/barbers");
    const json = await r.json();
    setItems(json.success ? json.data : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/barbers")
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
    const r = await fetch("/api/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const json = await r.json();
      alert(json.error?.message || "Error");
      return;
    }
    setForm({ name: "", phone: "", email: "", specialty: "" });
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Barberos</h1>
          <p className="text-sm text-zinc-500 mt-1">Equipo y especialidades.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 bg-zinc-950 text-white rounded-xl text-sm font-semibold flex gap-2 items-center">
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 grid place-items-center">
                <Scissors size={18} />
              </div>
              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2 py-1">Activo</span>
            </div>
            <h2 className="mt-4 font-semibold">{b.name}</h2>
            <p className="text-xs text-zinc-500 mt-1">{b.specialty || "Barbero"}</p>
            <div className="mt-5 space-y-2 text-xs text-zinc-600">
              <div>{b.phone || "Sin teléfono"}</div>
              <div>{b.email || "Sin correo"}</div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">Sin barberos registrados.</div>}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onMouseDown={() => setOpen(false)}>
          <form onSubmit={save} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-lg">Nuevo barbero</h2>
            <div className="mt-5 space-y-4">
              {([["Nombre", "name"], ["Teléfono", "phone"], ["Correo", "email"], ["Especialidad", "specialty"]] as const).map(([label, key]) => (
                <label key={key} className="block text-xs font-medium">
                  {label}
                  <input
                    className="mt-1.5 h-10 w-full border rounded-xl px-3 text-sm"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 border rounded-xl text-sm">Cancelar</button>
              <button className="h-10 px-4 rounded-xl bg-zinc-950 text-white text-sm font-semibold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}