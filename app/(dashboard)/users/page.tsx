"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import { money } from "@/lib/format";

type Role = "OWNER" | "ADMIN" | "BARBER" | "CLIENT";
type Barber = { id: string; name: string };

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  barber: { id: string; name: string } | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    active: boolean;
    appointmentCount: number;
    totalSpentCents: number;
    lastAppointmentAt: string | null;
  } | null;
};

const ROLES: Record<Role, string> = { OWNER: "Dueño", ADMIN: "Admin", BARBER: "Barbero", CLIENT: "Cliente" };
const roleColors: Record<Role, string> = {
  OWNER: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  ADMIN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
  BARBER: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  CLIENT: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
};

const LIMIT = 20;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [active, setActive] = useState("ALL");
  const [editing, setEditing] = useState<User | null | "new">(null);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [currency, setCurrency] = useState("USD");

  const loadData = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (q.trim()) params.set("q", q.trim());
    if (role !== "ALL") params.set("role", role);
    if (active !== "ALL") params.set("active", active);
    const r = await fetch(`/api/users?${params.toString()}`);
    const json = await r.json();
    if (!json.success) throw new Error(json.error?.message ?? "No se pudo cargar");
    return { users: json.data.users ?? [], total: json.data.total ?? 0 };
  }, [page, q, role, active]);

  const reload = useCallback(() => {
    loadData()
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch(() => {
        setUsers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    fetch("/api/barbers")
      .then((r) => r.json())
      .then((json) => setBarbers(json.success ? json.data : []));
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        const c = json?.data?.settings?.currency;
        if (typeof c === "string" && c) setCurrency(c);
      })
      .catch(() => {});
  }, []);

  const filter = (next: Partial<{ q: string; role: string; active: string }>) => {
    setLoading(true);
    if (next.q !== undefined) setQ(next.q);
    if (next.role !== undefined) setRole(next.role);
    if (next.active !== undefined) setActive(next.active);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Usuarios</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Cuentas del sistema y roles de acceso · {total}</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-gold dark:text-zinc-950 dark:hover:bg-gold-light"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Búsqueda</span>
            <input
              value={q}
              onChange={(e) => filter({ q: e.target.value })}
              placeholder="Nombre o correo..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Rol</span>
            <select value={role} onChange={(e) => filter({ role: e.target.value })} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900">
              <option value="ALL">Todos</option>
              <option value="OWNER">Dueño</option>
              <option value="ADMIN">Admin</option>
              <option value="BARBER">Barbero</option>
              <option value="CLIENT">Cliente</option>
            </select>
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Estado</span>
            <select value={active} onChange={(e) => filter({ active: e.target.value })} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900">
              <option value="ALL">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={() => {
                setLoading(true);
                setQ("");
                setRole("ALL");
                setActive("ALL");
                setPage(1);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw size={14} /> Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Perfil vinculado</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">No hay usuarios con estos filtros.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${roleColors[u.role]}`}>{ROLES[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "BARBER" && (u.barber?.name ?? <span className="font-medium text-amber-600 dark:text-amber-400">Sin perfil de barbero</span>)}
                      {u.role === "CLIENT" && (u.client?.name ?? <span className="font-medium text-amber-600 dark:text-amber-400">Sin perfil de cliente</span>)}
                      {u.role !== "BARBER" && u.role !== "CLIENT" && <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Editar" onClick={() => setEditing(u)}><Pencil size={14} /></IconBtn>
                        <IconBtn title="Cambiar contraseña" onClick={() => setPasswordFor(u)}><KeyRound size={14} /></IconBtn>
                        <IconBtn title={u.active ? "Desactivar" : "Activar"} onClick={async () => await toggleActive(u)}>
                          <Power size={14} />
                        </IconBtn>
                        <IconBtn title="Eliminar" danger onClick={() => setDeleting(u)}><Trash2 size={14} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700">Anterior</button>
            <button disabled={page >= totalPages} onClick={() => { setLoading(true); setPage((p) => Math.min(totalPages, p + 1)); }} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700">Siguiente</button>
          </div>
        </div>
      </div>

      {editing !== null && (
        <UserFormDialog
          user={editing === "new" ? null : editing}
          barbers={barbers}
          currency={currency}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
          onChangePassword={editing !== "new" ? () => { setPasswordFor(editing as User); setEditing(null); } : undefined}
        />
      )}
      {passwordFor && <PasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} onSaved={() => { setPasswordFor(null); reload(); }} />}
      {deleting && <ConfirmDelete user={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); reload(); }} />}
    </div>
  );
}

async function toggleActive(u: User) {
  const r = await fetch(`/api/users/${u.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: !u.active }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    alert(j.error?.message || "No se pudo cambiar el estado");
  }
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function IconBtn({ title, onClick, danger = false, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${danger ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
    >
      {children}
    </button>
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

const inputCls = "w-full h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100";

function UserFormDialog({ user, barbers, currency, onClose, onSaved, onChangePassword }: {
  user: User | null;
  barbers: Barber[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
  onChangePassword?: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? ("CLIENT" as Role),
    active: user?.active ?? true,
    barberId: user?.barber?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = user !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    if (isEdit) delete payload.password;
    if (!payload.barberId) payload.barberId = null;
    const r = await fetch(isEdit ? `/api/users/${user!.id}` : "/api/users", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) {
      onSaved();
    } else {
      const j = await r.json().catch(() => ({}));
      alert(j.error?.message || "No se pudo guardar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 dark:bg-black/40" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{isEdit ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{isEdit ? "Actualiza los datos y el rol." : "Crea una cuenta de acceso."}</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">×</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Correo"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
          {!isEdit && <Field label="Contraseña"><input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} /></Field>}
          <Field label="Rol">
            <select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as Role;
                setForm({ ...form, role, barberId: role !== "BARBER" ? "" : form.barberId });
              }}
              className={inputCls}
            >
              <option value="OWNER">Dueño</option>
              <option value="ADMIN">Admin</option>
              <option value="BARBER">Barbero</option>
              <option value="CLIENT">Cliente</option>
            </select>
          </Field>
          <Field label="Estado">
            <select value={form.active ? "true" : "false"} onChange={(e) => setForm({ ...form, active: e.target.value === "true" })} className={inputCls}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
          {form.role === "BARBER" && (
            <Field label="Vinculado a barbero (opcional)">
              <select
                value={form.barberId}
                onChange={(e) => setForm({ ...form, barberId: e.target.value })}
                className={inputCls}
              >
                <option value="">— Sin vínculo —</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
          {form.role === "CLIENT" && (
            <div className="sm:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2.5 text-xs">
              {user?.client ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <strong className="font-semibold text-zinc-800 dark:text-zinc-100">{user.client.name}</strong>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${user.client.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>{user.client.active ? "Activo" : "Inactivo"}</span>
                  </div>
                  <div className="grid gap-1 text-zinc-600 dark:text-zinc-400">
                    {user.client.email && <p><span className="text-zinc-400 dark:text-zinc-500">Correo:</span> {user.client.email}</p>}
                    {user.client.phone && <p><span className="text-zinc-400 dark:text-zinc-500">Teléfono:</span> {user.client.phone}</p>}
                    {user.client.notes && <p><span className="text-zinc-400 dark:text-zinc-500">Notas:</span> {user.client.notes}</p>}
                    <p><span className="text-zinc-400 dark:text-zinc-500">Citas registradas:</span> {user.client.appointmentCount}</p>
                    <p><span className="text-zinc-400 dark:text-zinc-500">Total gastado:</span> {money(user.client.totalSpentCents, currency)}</p>
                    <p><span className="text-zinc-400 dark:text-zinc-500">Última visita:</span> {user.client.lastAppointmentAt ? new Date(user.client.lastAppointmentAt).toLocaleDateString("es-ES") : "—"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 dark:text-amber-400">
                  Sin perfil de cliente: se vinculará automáticamente por correo cuando el usuario haga su primera reserva.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {isEdit && onChangePassword && (
            <button type="button" onClick={onChangePassword} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <KeyRound size={14} /> Cambiar contraseña
            </button>
          )}
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button>
          <button disabled={saving} className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-gold dark:text-zinc-950 dark:hover:bg-gold-light">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (r.ok) onSaved();
    else {
      const j = await r.json().catch(() => ({}));
      alert(j.error?.message || "No se pudo cambiar la contraseña");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 dark:bg-black/40" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cambiar contraseña</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{user.name} · {user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">×</button>
        </div>
        <label className="mt-6 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Nueva contraseña
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1.5`} />
        </label>
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button>
          <button disabled={saving} className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-gold dark:text-zinc-950 dark:hover:bg-gold-light">
            {saving ? "Guardando..." : "Cambiar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: () => void }) {
  const [saving, setSaving] = useState(false);

  async function go() {
    setSaving(true);
    const r = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    setSaving(false);
    if (r.ok) onDeleted();
    else {
      const j = await r.json().catch(() => ({}));
      alert(j.error?.message || "No se pudo eliminar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 dark:bg-black/40" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Eliminar usuario</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          ¿Eliminar a <strong className="text-zinc-800 dark:text-zinc-200">{user.name}</strong> ({user.email})? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button onClick={onClose} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button>
          <button disabled={saving} onClick={go} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {saving ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
