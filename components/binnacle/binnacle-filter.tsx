"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Props = { from: string; to: string; category: string; severity: string; q: string };

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Todas las categorías" },
  { value: "AUTHENTICATION", label: "Autenticación" },
  { value: "USER_ACTION", label: "Acciones de usuario" },
  { value: "SYSTEM", label: "Sistema" },
  { value: "SECURITY", label: "Seguridad" },
  { value: "ERROR", label: "Errores" },
];

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "Todas las severidades" },
  { value: "DEBUG", label: "Debug" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Advertencias" },
  { value: "CRITICAL", label: "Críticas" },
  { value: "ALERT", label: "Alertas" },
];

export function BinnacleFilter({ from, to, category, severity, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [qInput, setQInput] = useState(q);

  function commit(next: Partial<Props>) {
    const merged = { from, to, category, severity, q: qInput, ...next };
    const params = new URLSearchParams();
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (merged.category && merged.category !== "ALL") params.set("category", merged.category);
    if (merged.severity && merged.severity !== "ALL") params.set("severity", merged.severity);
    const qtrim = merged.q.trim();
    if (qtrim) params.set("q", qtrim);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (qInput !== q) commit({ q: qInput });
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => commit({ category: e.target.value })}
          className="h-9 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          aria-label="Categoría"
        >
          {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select
          value={severity}
          onChange={(e) => commit({ severity: e.target.value })}
          className="h-9 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          aria-label="Severidad"
        >
          {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => commit({ from: e.target.value })}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
          aria-label="Fecha desde"
        />
        <span className="text-xs text-zinc-400 dark:text-zinc-500">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => commit({ to: e.target.value })}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
          aria-label="Fecha hasta"
        />
      </div>
      <div className="relative lg:ml-auto lg:w-64">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar evento o detalle..."
          className="h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 pl-9 pr-8 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          aria-label="Buscar en la bitácora"
        />
        {qInput && (
          <button type="button" onClick={() => { setQInput(""); commit({ q: "" }); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Limpiar búsqueda">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}