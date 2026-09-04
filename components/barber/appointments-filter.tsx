"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Props = { from: string; to: string; status: string; q: string };

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No asistió" },
];

export function BarberAppointmentsFilter({ from, to, status, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [qInput, setQInput] = useState(q);

  function commit(next: Partial<Props>) {
    const merged = { from, to, status, q: qInput, ...next };
    const params = new URLSearchParams();
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
    const qtrim = merged.q.trim();
    if (qtrim) params.set("q", qtrim);
    // Cualquier cambio de filtro reinicia la paginación.
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <StatusDropdown value={status} onChange={(v) => commit({ status: v })} />
        <div className="relative flex flex-wrap items-center gap-2">
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
      </div>

      <div className="relative w-full">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Buscar cliente, teléfono o correo..."
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

// Menú desplegable para el filtro de estado, en lugar de un <select> nativo.
// Se renderiza "fixed" para que no lo recorte el contenedor y, en pantallas
// pequeñas, ocupa su propia fila (w-full) separándolo del rango de fechas.
const STATUS_MENU_WIDTH = 176; // w-44

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Estado"
        className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 sm:w-auto sm:min-w-44"
      >
        <span>{current.label}</span>
        <ChevronDown size={12} strokeWidth={2.5} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left, minWidth: STATUS_MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={13} className="text-zinc-950 dark:text-gold" />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
