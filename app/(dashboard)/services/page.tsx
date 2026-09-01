"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Clock3, Pencil, Plus, Scissors, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { UploadButton } from "@/lib/uploadthing";

type Service = {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  durationMin: number;
  priceCents: number;
};

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", durationMin: "30", price: "15" });

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
    const payload = {
      ...form,
      imageUrl: form.imageUrl.trim() || null,
      durationMin: Number(form.durationMin),
      priceCents: Math.round(Number(form.price) * 100),
    };

    const r = await fetch("/api/services", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });

    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo guardar el servicio");
      return;
    }

    setForm({ name: "", description: "", imageUrl: "", durationMin: "30", price: "15" });
    setOpen(false);
    setEditing(null);
    toast.success(editing ? "Servicio actualizado" : "Servicio creado");
    load();
  }

  function startEditing(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description || "",
      imageUrl: service.imageUrl || "",
      durationMin: String(service.durationMin),
      price: (service.priceCents / 100).toFixed(2),
    });
    setOpen(true);
  }

  async function remove(service: Service) {
    if (!window.confirm(`¿Desactivar ${service.name}?`)) return;

    const r = await fetch("/api/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id }),
    });

    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo desactivar el servicio");
      return;
    }

    toast.success("Servicio desactivado");
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
            <div className="flex items-start justify-between">
              {s.imageUrl ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                  <Image src={s.imageUrl} alt={s.name} fill className="object-cover" sizes="40px" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-zinc-600 dark:text-zinc-400">
                  <Clock3 size={17} />
                </div>
              )}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => startEditing(s)} className="h-8 w-8 grid place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors" aria-label={`Editar ${s.name}`} title="Editar">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => remove(s)} className="h-8 w-8 grid place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 transition-colors" aria-label={`Desactivar ${s.name}`} title="Desactivar">
                  <Trash2 size={15} />
                </button>
                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-1 h-fit font-bold">Activo</span>
              </div>
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
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{editing ? "Editar servicio" : "Nuevo servicio"}</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre
                <input required className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Descripción
                <input className="mt-1.5 h-10 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-500" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>

              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Imagen del servicio
                <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                    {form.imageUrl ? (
                      <div className="h-full w-full bg-cover bg-center" role="img" aria-label="Vista previa de la imagen del servicio" style={{ backgroundImage: `url(${form.imageUrl})` }} />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-zinc-400 dark:text-zinc-500">
                        <Scissors size={22} />
                      </div>
                    )}
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-zinc-950/80 dark:bg-zinc-800 text-white dark:text-zinc-300 hover:bg-zinc-950"
                        aria-label="Quitar imagen"
                        title="Quitar imagen"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 w-full flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words">Foto del servicio</p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 break-words">PNG, JPG, GIF o SVG · máximo 2 MB</p>
                    <div className="mt-2 w-full max-w-[220px]">
                      <UploadButton
                        className="w-full max-w-[220px]"
                        appearance={{
                          container: "w-full max-w-[220px]",
                          button: "w-full !h-10 !min-w-0 !px-3 !rounded-lg !bg-zinc-950 dark:!bg-gold !text-white dark:!text-zinc-950 !shadow-none !border-0 hover:!bg-zinc-800 dark:hover:!bg-gold-light",
                          allowedContent: "hidden",
                        }}
                        content={{ button: "Seleccionar", allowedContent: "" }}
                        endpoint="brandingUploader"
                        onUploadBegin={() => setUploading(true)}
                        onClientUploadComplete={(files) => {
                          const uploaded = files?.[0];
                          if (uploaded) setForm({ ...form, imageUrl: uploaded.ufsUrl });
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
                    </div>
                    {uploading ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">Subiendo imagen...</p>
                    ) : form.imageUrl ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check size={13} /> Imagen lista</p>
                    ) : null}
                  </div>
                </div>
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
              <button type="button" onClick={() => { setOpen(false); setEditing(null); setForm({ name: "", description: "", imageUrl: "", durationMin: "30", price: "15" }); }} className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}