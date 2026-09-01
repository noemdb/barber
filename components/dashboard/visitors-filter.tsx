"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Props = {
  startDate: string;
  endDate: string;
  device: string;
  type: string;
  q: string;
};

const DEVICE_OPTIONS = [
  { value: "ALL", label: "Todos los dispositivos" },
  { value: "desktop", label: "Escritorio" },
  { value: "mobile", label: "Móvil" },
  { value: "tablet", label: "Tableta" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Todas las fuentes" },
  { value: "ORGANIC", label: "Orgánico" },
  { value: "DIRECT", label: "Directo" },
  { value: "REFERRAL", label: "Referido" },
];

export function VisitorsFilter({ startDate, endDate, device, type, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [qInput, setQInput] = useState(q);

  useEffect(() => setQInput(q), [q]);

  function commit(next: Partial<Props>) {
    const merged = { startDate, endDate, device, type, q: qInput, ...next };
    const params = new URLSearchParams();
    if (merged.startDate) params.set("startDate", merged.startDate);
    if (merged.endDate) params.set("endDate", merged.endDate);
    if (merged.device && merged.device !== "ALL") params.set("device", merged.device);
    if (merged.type && merged.type !== "ALL") params.set("type", merged.type);
    if (merged.q.trim()) params.set("q", merged.q.trim());
    // Cualquier cambio de filtro reinicia la paginación.
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounce de la búsqueda por país/ciudad/referrer.
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
    <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={device} onChange={(v) => commit({ device: v })} options={DEVICE_OPTIONS} />
        <FilterSelect value={type} onChange={(v) => commit({ type: v })} options={TYPE_OPTIONS} />
        <input
          type="date"
          value={startDate}
          onChange={(e) => commit({ startDate: e.target.value })}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
          aria-label="Fecha de inicio"
        />
        <span className="text-xs text-zinc-400 dark:text-zinc-500">→</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => commit({ endDate: e.target.value })}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
          aria-label="Fecha de fin"
        />
      </div>

      <div className="relative lg:ml-auto lg:w-64">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar país, ciudad o referrer..."
          className="h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 pl-9 pr-8 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        {qInput && (
          <button
            type="button"
            onClick={() => {
              setQInput("");
              commit({ q: "" });
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
