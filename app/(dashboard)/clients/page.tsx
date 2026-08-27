"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Mail, Pencil, Phone, Plus, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

type Client = { id: string; name: string; phone: string | null; email: string | null; notes: string | null };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
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
    setForm({ name: "", phone: "", email: "", notes: "" });
    setOpen(false);
    setEditing(null);
    setSaving(false);
    toast.success(editing ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
    load();
  }

  function startEditing(client: Client) {
    setEditing(client);
    setForm({ name: client.name, phone: client.phone || "", email: client.email || "", notes: client.notes || "" });
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
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar nombre, teléfono o correo" className="w-full bg-transparent text-sm" />
            {q && <button type="button" onClick={() => { setQ(""); setPage(1); }} className="text-zinc-400 hover:text-zinc-900" aria-label="Limpiar búsqueda"><X size={15} /></button>}
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
                <th className="px-5 py-3">Estado</th>
                <th className="sticky right-0 bg-zinc-50/95 px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && visibleItems.map((c) => (
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
                  <td className="sticky right-0 border-l border-zinc-100 bg-white px-5 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(24,24,27,0.35)]">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setViewing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950" aria-label={`Visualizar ${c.name}`} title="Visualizar"><Eye size={14} /></button>
                      <button type="button" onClick={() => startEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950" aria-label={`Editar ${c.name}`} title="Editar"><Pencil size={14} /></button>
                      <button type="button" onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-700" aria-label={`Desactivar ${c.name}`} title="Desactivar"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="space-y-3 p-5">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-xl bg-zinc-100" />)}</div>}
          {error && <div className="p-10 text-center"><p className="text-sm font-medium text-zinc-700">No pudimos cargar los clientes.</p><button type="button" onClick={load} className="mt-3 text-xs font-semibold text-gold-dark hover:underline">Reintentar</button></div>}
          {!loading && !error && filtered.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">{q ? "No hay resultados para esa búsqueda." : "Sin clientes registrados."}</div>}
        </div>
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}</p>
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página anterior" title="Página anterior"><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition-colors ${pageNumber === currentPage ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"}`} aria-label={`Página ${pageNumber}`} aria-current={pageNumber === currentPage ? "page" : undefined}>{pageNumber}</button>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página siguiente" title="Página siguiente"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
      {open && (
        <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={save} saving={saving}>
          <Field label="Nombre">
            <input type="text" autoFocus required value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100" />
          </Field>
          <Field label="Teléfono">
            <input type="text" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100" />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100" />
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="min-h-24 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100" />
          </Field>
        </Modal>
      )}
      {viewing && <ClientDetails client={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ClientDetails({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="client-details-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold text-sm font-bold text-zinc-950">{client.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
            <div>
              <h2 id="client-details-title" className="font-semibold text-lg">{client.name}</h2>
              <span className="text-xs text-emerald-700">Cliente activo</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950" aria-label="Cerrar detalles" title="Cerrar"><X size={16} /></button>
        </div>
        <div className="mt-6 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="flex items-center gap-3"><Phone size={15} className="text-zinc-400" /><span>{client.phone || "Sin teléfono registrado"}</span></div>
          <div className="flex items-center gap-3"><Mail size={15} className="text-zinc-400" /><span>{client.email || "Sin correo registrado"}</span></div>
        </div>
        {client.notes && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Notas</p><p className="mt-2 rounded-xl border border-zinc-100 p-3 text-sm text-zinc-600">{client.notes}</p></div>}
        <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white">Cerrar</button></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Modal({ title, onClose, onSubmit, saving, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="client-form-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id="client-form-title" className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">Completa la información del cliente.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950" aria-label="Cerrar formulario" title="Cerrar formulario"><X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">Cancelar</button>
          <button disabled={saving} className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
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