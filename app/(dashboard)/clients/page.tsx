"use client";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Mail, Pencil, Phone, Plus, RefreshCw, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";
import { money, tzFormat } from "@/lib/format";

type Client = { id: string; name: string; phone: string | null; email: string | null; notes: string | null; avatar?: string | null; _count?: { appointments: number } };

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};
const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  COMPLETED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  CANCELLED: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  NO_SHOW: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};
const paymentLabels: Record<string, string> = { PAID: "Pagado", PENDING: "Pendiente", REFUNDED: "Reembolsado" };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", avatar: "" });
  const [page, setPage] = useState(1);
  const pageSize = 8;

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/clients", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
    });
    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo guardar el cliente");
      setSaving(false);
      return;
    }
    setForm({ name: "", phone: "", email: "", notes: "", avatar: "" });
    setOpen(false);
    setEditing(null);
    setSaving(false);
    toast.success(editing ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
    load();
  }

  function startEditing(client: Client) {
    setEditing(client);
    setForm({ name: client.name, phone: client.phone || "", email: client.email || "", notes: client.notes || "", avatar: client.avatar || "" });
    setOpen(true);
  }

  async function remove(client: Client) {
    if (!window.confirm(`¿Desactivar a ${client.name}? Esta acción ocultará el cliente del directorio.`)) return;
    const r = await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id }),
    });
    if (!r.ok) {
      const json = await r.json();
      toast.error(json.error?.message || "No se pudo desactivar el cliente");
      return;
    }
    toast.success("Cliente desactivado");
    load();
  }

  const withPhone = items.filter((client) => client.phone).length;
  const withEmail = items.filter((client) => client.email).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark dark:text-gold-light">
            <Users size={14} /> Directorio
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Consulta y administra los datos de tus clientes.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary label="Clientes activos" value={items.length} detail="En tu directorio" />
        <Summary label="Con teléfono" value={withPhone} detail={`${items.length ? Math.round((withPhone / items.length) * 100) : 0}% del total`} />
        <Summary label="Con correo" value={withEmail} detail={`${items.length ? Math.round((withEmail / items.length) * 100) : 0}% del total`} />
      </div>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 h-10 sm:w-[360px] focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:bg-white dark:focus-within:bg-zinc-800 transition-colors">
            <Search size={16} className="text-zinc-400 dark:text-zinc-500" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar nombre, teléfono o correo" className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none" />
            {q && <button type="button" onClick={() => { setQ(""); setPage(1); }} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" aria-label="Limpiar búsqueda"><X size={15} /></button>}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{filtered.length} de {items.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Cliente</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Teléfono</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Correo</th>
                <th className="px-5 py-3 text-zinc-500 dark:text-zinc-400">Estado</th>
                <th className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400" title="Citas registradas">Citas</th>
                <th className="sticky right-0 bg-zinc-50/95 dark:bg-zinc-900/95 px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && visibleItems.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100">
                  <td className="px-5 py-3 font-semibold flex items-center gap-3">
                    {c.avatar ? (
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 bg-cover bg-center" style={{ backgroundImage: `url(${c.avatar})` }} aria-label={`Avatar de ${c.name}`} />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold-light to-gold grid place-items-center text-[10px] font-bold text-zinc-950">
                        {c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                      </div>
                    )}
                    <span>{c.name}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400"><span className="inline-flex items-center gap-2"><Phone size={13} className="text-zinc-400 dark:text-zinc-500" />{c.phone || "Sin teléfono"}</span></td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400"><span className="inline-flex items-center gap-2"><Mail size={13} className="text-zinc-400 dark:text-zinc-500" />{c.email || "Sin correo"}</span></td>
                  <td className="px-5 py-3"><span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Activo</span></td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100" title={`${c._count?.appointments ?? 0} citas registradas`}>{c._count?.appointments ?? 0}</td>
                  <td className="sticky right-0 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(24,24,27,0.35)] dark:shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.45)]">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setViewing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors" aria-label={`Visualizar ${c.name}`} title="Visualizar"><Eye size={14} /></button>
                      <button type="button" onClick={() => startEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors" aria-label={`Editar ${c.name}`} title="Editar"><Pencil size={14} /></button>
                      <button type="button" onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 transition-colors" aria-label={`Desactivar ${c.name}`} title="Desactivar"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="space-y-3 p-5">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>}
          {error && <div className="p-10 text-center"><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No pudimos cargar los clientes.</p><button type="button" onClick={load} className="mt-3 text-xs font-semibold text-gold-dark dark:text-gold-light hover:underline">Reintentar</button></div>}
          {!loading && !error && filtered.length === 0 && <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{q ? "No hay resultados para esa búsqueda." : "Sin clientes registrados."}</div>}
        </div>
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}</p>
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página anterior" title="Página anterior"><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition-colors ${pageNumber === currentPage ? "bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} aria-label={`Página ${pageNumber}`} aria-current={pageNumber === currentPage ? "page" : undefined}>{pageNumber}</button>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página siguiente" title="Página siguiente"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
      {open && (
        <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={save} saving={saving}>
          <Field label="Nombre">
            <input type="text" autoFocus required value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-800 outline-none" />
          </Field>
          <Field label="Teléfono">
            <input type="text" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-800 outline-none" />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-800 outline-none" />
          </Field>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span>Avatar</span>
            <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 sm:flex-row sm:items-center">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                {form.avatar ? (
                  <div className="h-full w-full bg-cover bg-center" role="img" aria-label="Vista previa del avatar del cliente" style={{ backgroundImage: `url(${form.avatar})` }} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-zinc-400 dark:text-zinc-500">
                    <Users size={22} />
                  </div>
                )}
                {form.avatar && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, avatar: "" }))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-zinc-950/80 dark:bg-zinc-800 text-white dark:text-zinc-300 hover:bg-zinc-950"
                    aria-label="Quitar avatar"
                    title="Quitar avatar"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="min-w-0 w-full flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words">Foto de perfil</p>
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
                    endpoint="avatarUploader"
                    onUploadBegin={() => setUploading(true)}
                    onClientUploadComplete={(files) => {
                      const uploaded = files?.[0];
                      if (uploaded) setForm((current) => ({ ...current, avatar: uploaded.ufsUrl }));
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
                ) : form.avatar ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check size={13} /> Avatar listo</p>
                ) : null}
              </div>
            </div>
          </label>
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="min-h-24 w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-800 outline-none" />
          </Field>
        </Modal>
      )}
      {viewing && <ClientDetails client={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

type ClientProfile = {
  client: Client;
  appointments: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    priceCents: number;
    service: { name: string };
    barber: { name: string };
    payment: { status: string; amountCents: number } | null;
  }[];
  stats: {
    totalAppointments: number;
    completed: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    noShow: number;
    totalSpentCents: number;
    averageSpendCents: number;
    lastVisit: string | null;
    firstVisit: string | null;
  };
  timezone: string;
};

function ClientDetails({ client, onClose }: { client: Client; onClose: () => void }) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setProfile(null);
    fetch(`/api/clients/${client.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setProfile(json.data as ClientProfile);
          setLoadState("ready");
        } else {
          toast.error(json.error?.message || "No se pudo cargar el perfil");
          setLoadState("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("No se pudo cargar el perfil");
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [client.id, reloadKey]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="client-details-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-3">
              {client.avatar ? (
                <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 bg-cover bg-center" style={{ backgroundImage: `url(${client.avatar})` }} aria-label={`Avatar de ${client.name}`} />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold text-sm font-bold text-zinc-950">{client.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
              )}
              <div>
                <h2 id="client-details-title" className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{client.name}</h2>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Cliente activo</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors" aria-label="Cerrar detalles" title="Cerrar"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto p-5">
            {loadState === "loading" && (
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
                </div>
                <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              </div>
            )}

            {loadState === "error" && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No pudimos cargar el perfil del cliente.</p>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"><RefreshCw size={14} /> Reintentar</button>
              </div>
            )}

            {loadState === "ready" && profile && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-3 text-sm text-zinc-900 dark:text-zinc-100"><Phone size={15} className="shrink-0 text-zinc-400 dark:text-zinc-500" /><span>{client.phone || "Sin teléfono registrado"}</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-3 text-sm text-zinc-900 dark:text-zinc-100"><Mail size={15} className="shrink-0 text-zinc-400 dark:text-zinc-500" /><span>{client.email || "Sin correo registrado"}</span></div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Kpi label="Citas" value={String(profile.stats.totalAppointments)} />
                  <Kpi label="Completadas" value={String(profile.stats.completed)} accent="text-emerald-700 dark:text-emerald-400" />
                  <Kpi label="Confirmadas" value={String(profile.stats.confirmed)} accent="text-indigo-700 dark:text-indigo-400" />
                  <Kpi label="Canceladas" value={String(profile.stats.cancelled)} accent="text-red-700 dark:text-red-400" />
                  <Kpi label="No asistió" value={String(profile.stats.noShow)} />
                  <Kpi label="Gastado" value={money(profile.stats.totalSpentCents)} accent="text-zinc-950 dark:text-zinc-100" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Última visita</p>
                    <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{profile.stats.lastVisit ? tzFormat(profile.stats.lastVisit, profile.timezone, { dateStyle: "medium" }) : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Gasto promedio</p>
                    <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{money(profile.stats.averageSpendCents)}</p>
                  </div>
                </div>

                {client.notes && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Notas</p>
                    <p className="mt-2 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3 text-sm text-zinc-600 dark:text-zinc-400">{client.notes}</p>
                  </div>
                )}

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Historial de citas</p>
                  {profile.appointments.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Este cliente aún no tiene citas registradas.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      {profile.appointments.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{a.service.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {tzFormat(a.startsAt, profile.timezone, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {a.barber.name}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses[a.status] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{statusLabels[a.status] ?? a.status}</span>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{money(a.priceCents)}</p>
                              {a.payment && <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{paymentLabels[a.payment.status] ?? a.payment.status}</p>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 p-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl bg-zinc-950 dark:bg-gold px-4 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 ${accent}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Modal({ title, onClose, onSubmit, saving, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 dark:bg-black/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="client-form-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 id="client-form-title" className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Completa la información del cliente.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100" aria-label="Cerrar formulario" title="Cerrar formulario"><X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancelar</button>
          <button disabled={saving} className="h-10 rounded-xl bg-zinc-950 dark:bg-gold px-4 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-800 dark:hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</strong>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{detail}</span>
      </div>
    </div>
  );
}