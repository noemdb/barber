"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const severityColors: Record<string, string> = {
  DEBUG: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  INFO: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  ALERT: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

type Entry = {
  id: string;
  eventType: string;
  category: string;
  severity: string;
  title: string;
  description?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  subjectIdentifier?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  objectIdentifier?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestUrl?: string | null;
  createdAt: string;
};

export default function BinnaclePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [eventType, setEventType] = useState("ALL");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("q", search);
      if (severity !== "ALL") params.set("severity", severity);
      if (eventType !== "ALL") params.set("eventType", eventType);

      try {
        const resp = await fetch(`/api/binnacle?${params.toString()}`);
        const json = await resp.json();
        if (!active) return;
        if (!json.success) throw new Error(json.error?.message ?? "No se pudo cargar la bitácora");
        setEntries(json.data.entries ?? []);
        setTotal(json.data.total ?? 0);
      } catch {
        setEntries([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [page, limit, search, severity, eventType]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Bitácora</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Registro de actividad del negocio, seguridad y autenticación.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total: {total}</div>
          <a
            href={`/api/binnacle/export?format=csv&${new URLSearchParams({
              ...(search ? { q: search } : {}),
              ...(severity !== "ALL" ? { severity } : {}),
              ...(eventType !== "ALL" ? { eventType } : {}),
            }).toString()}`}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Exportar CSV
          </a>
          <a
            href={`/api/binnacle/export?format=json&${new URLSearchParams({
              ...(search ? { q: search } : {}),
              ...(severity !== "ALL" ? { severity } : {}),
              ...(eventType !== "ALL" ? { eventType } : {}),
            }).toString()}`}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Exportar JSON
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Búsqueda</span>
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="evento, usuario o texto"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Severidad</span>
            <select
              value={severity}
              onChange={(e) => {
                setPage(1);
                setSeverity(e.target.value);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="ALL">Todas</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ALERT">ALERT</option>
            </select>
          </label>

          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mb-1 block">Tipo</span>
            <select
              value={eventType}
              onChange={(e) => {
                setPage(1);
                setEventType(e.target.value);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="ALL">Todos</option>
              <option value="login_success">login_success</option>
              <option value="login_failed">login_failed</option>
              <option value="appointment_created">appointment_created</option>
              <option value="user_updated">user_updated</option>
              <option value="payment_paid">payment_paid</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Severidad</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Objeto</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Cargando...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No hay eventos en la bitácora.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">
                      {new Date(entry.createdAt).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/settings/binnacle/${entry.id}`} className="inline-block font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300">
                        {entry.title}
                      </Link>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{entry.eventType}</div>
                      {entry.description && <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{entry.description}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${severityColors[entry.severity] ?? severityColors.INFO}`}>
                        {entry.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">
                      <div>{entry.subjectIdentifier ?? entry.subjectType ?? "Sistema"}</div>
                      {entry.subjectId && <div className="text-[10px] text-zinc-500">{entry.subjectId}</div>}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">
                      <div>{entry.objectIdentifier ?? entry.objectType ?? "—"}</div>
                      {entry.objectId && <div className="text-[10px] text-zinc-500">{entry.objectId}</div>}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">{entry.ipAddress ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
        >
          Anterior
        </button>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Página {page} de {totalPages}</div>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
