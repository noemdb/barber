"use client";
import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Scissors, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

type Barber = { id: string; name: string; phone: string | null; email: string | null; specialty: string | null; avatar: string | null };

export default function BarbersPage() {
  const [items, setItems] = useState<Barber[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", specialty: "", avatar: "" });
  const [uploading, setUploading] = useState(false);

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
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
    });
    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo guardar el barbero");
      return;
    }
    setForm({ name: "", phone: "", email: "", specialty: "", avatar: "" });
    setOpen(false);
    setEditing(null);
    toast.success(editing ? "Barbero actualizado" : "Barbero creado");
    load();
  }

  function startEditing(barber: Barber) {
    setEditing(barber);
    setForm({
      name: barber.name,
      phone: barber.phone || "",
      email: barber.email || "",
      specialty: barber.specialty || "",
      avatar: barber.avatar || "",
    });
    setOpen(true);
  }

  async function remove(barber: Barber) {
    if (!window.confirm(`¿Desactivar a ${barber.name}?`)) return;
    const r = await fetch("/api/barbers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id }),
    });
    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo desactivar el barbero");
      return;
    }
    toast.success("Barbero desactivado");
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Barberos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Equipo y especialidades.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 rounded-xl text-sm font-semibold flex gap-2 items-center hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((b) => (
          <div key={b.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div
                className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 bg-cover bg-center grid place-items-center overflow-hidden"
                role="img"
                aria-label={`Avatar de ${b.name}`}
                style={b.avatar ? { backgroundImage: `url(${b.avatar})` } : undefined}
              >
                {!b.avatar && <Scissors size={18} className="text-zinc-400 dark:text-zinc-500" />}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => startEditing(b)} className="h-8 w-8 grid place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors" aria-label={`Editar ${b.name}`} title="Editar">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => remove(b)} className="h-8 w-8 grid place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 transition-colors" aria-label={`Desactivar ${b.name}`} title="Desactivar">
                  <Trash2 size={15} />
                </button>
                <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-1">Activo</span>
              </div>
            </div>
            <h2 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{b.specialty || "Barbero"}</p>
            <div className="mt-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div>{b.phone || "Sin teléfono"}</div>
              <div>{b.email || "Sin correo"}</div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin barberos registrados.</div>}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 grid place-items-center p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <form onSubmit={save} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{editing ? "Editar barbero" : "Nuevo barbero"}</h2>
            <div className="mt-5 space-y-4">
              {([["Nombre", "name"], ["Teléfono", "phone"], ["Correo", "email"], ["Especialidad", "specialty"]] as const).map(([label, key]) => (
                <label key={key} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {label}
                  <input
                    className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Avatar
                  <div className="mt-2 flex items-center gap-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                      {form.avatar ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          role="img"
                          aria-label="Vista previa del avatar"
                          style={{ backgroundImage: `url(${form.avatar})` }}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-zinc-400 dark:text-zinc-500">
                          <Scissors size={22} />
                        </div>
                      )}
                      {form.avatar && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, avatar: "" })}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-zinc-950/80 dark:bg-zinc-800 text-white dark:text-zinc-300 hover:bg-zinc-950"
                          aria-label="Quitar avatar"
                          title="Quitar avatar"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Foto de perfil</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">PNG, JPG, GIF o SVG · máximo 2 MB</p>
                      <UploadButton
                        endpoint="avatarUploader"
                        onUploadBegin={() => setUploading(true)}
                        onClientUploadComplete={(files) => {
                          const uploaded = files?.[0];
                          if (uploaded) setForm({ ...form, avatar: uploaded.ufsUrl });
                          setUploading(false);
                        }}
                        onUploadError={(error) => {
                          setUploading(false);
                          const message = error.message.includes("FileSizeMismatch")
                            ? "La imagen supera el límite de 2 MB"
                            : error.message.includes("FileTypeMismatch")
                              ? "Solo se permiten imágenes PNG, JPG, GIF o SVG"
                              : error.message || "No se pudo cargar la imagen";
                          toast.error(message);
                        }}
                        config={{ mode: "auto" }}
                      />
                      {uploading ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">Subiendo imagen...</p>
                      ) : form.avatar ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check size={13} /> Avatar listo</p>
                      ) : null}
                    </div>
                  </div>
                </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}