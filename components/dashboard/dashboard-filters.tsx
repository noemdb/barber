"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Scissors, User, UsersRound, X } from "lucide-react";
import { FilterDropdown } from "./filter-dropdown";

type Option = { id: string; name: string };

const PERIOD_OPTIONS: Option[] = [
  { id: "all", name: "Todos" },
  { id: "today", name: "Hoy" },
  { id: "week", name: "Semana" },
  { id: "month", name: "Mes" },
  { id: "3m", name: "3 meses" },
  { id: "6m", name: "6 meses" },
];

const PERIOD_NAME: Record<string, string> = {
  all: "Todos",
  today: "Hoy",
  week: "Semana",
  month: "Mes",
  "3m": "3 meses",
  "6m": "6 meses",
};

// El rango por defecto no lleva parámetro en la URL.
const DEFAULT_RANGE = "week";

// Clave de localStorage para recordar el último filtro usado.
const STORAGE_KEY = "dashboard.filters";

type Props = {
  range: string;
  barberId: string;
  serviceId: string;
  clientId: string;
  barbers: Option[];
  services: Option[];
  clients: Option[];
  resultCount: number;
  resultIncome: string;
};

export function DashboardFilters({ range, barberId, serviceId, clientId, barbers, services, clients, resultCount, resultIncome }: Props) {
  const router = useRouter();

  function build(next: { range?: string; barberId?: string; serviceId?: string; clientId?: string }): string {
    const merged = { range, barberId, serviceId, clientId, ...next };
    const p = new URLSearchParams();
    if (merged.range !== DEFAULT_RANGE) p.set("range", merged.range);
    if (merged.barberId) p.set("barberId", merged.barberId);
    if (merged.serviceId) p.set("serviceId", merged.serviceId);
    if (merged.clientId) p.set("clientId", merged.clientId);
    const qs = p.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  /** Guarda el filtro y navega. */
  function apply(next: { range?: string; barberId?: string; serviceId?: string; clientId?: string }) {
    const merged = { range, barberId, serviceId, clientId, ...next };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* localStorage no disponible (SSR/iframe) */
    }
    router.push(build(next));
  }

  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    router.push("/dashboard");
  }

  // Restaura el último filtro guardado SOLO cuando la URL viene sin parámetros
  // (la URL explícita del usuario tiene prioridad).
  useEffect(() => {
    if (window.location.search) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { range?: string; barberId?: string; serviceId?: string; clientId?: string };
      if (!saved || typeof saved !== "object") return;
      const target = build(saved);
      const current = window.location.pathname + window.location.search;
      if (target !== current) router.replace(target);
    } catch {
      /* parse fallido */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const barber = barbers.find((b) => b.id === barberId);
  const service = services.find((s) => s.id === serviceId);
  const client = clients.find((c) => c.id === clientId);

  const hasActive = Boolean(barberId || serviceId || clientId || range !== DEFAULT_RANGE);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (range !== DEFAULT_RANGE) chips.push({ key: "range", label: PERIOD_NAME[range] ?? range, onRemove: () => apply({ range: DEFAULT_RANGE }) });
  if (barber) chips.push({ key: "barber", label: barber.name, onRemove: () => apply({ barberId: "" }) });
  if (service) chips.push({ key: "service", label: service.name, onRemove: () => apply({ serviceId: "" }) });
  if (client) chips.push({ key: "client", label: client.name, onRemove: () => apply({ clientId: "" }) });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-sm">
        <span className="hidden sm:flex items-center gap-1.5 pl-2 pr-0.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          <CalendarRange size={14} />
          Periodo
        </span>
        <FilterDropdown
          icon={<CalendarRange size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
          placeholder="Todos"
          value={range}
          options={PERIOD_OPTIONS}
          onChange={(v) => apply({ range: v })}
          ariaLabel="Filtrar por periodo"
          disableReset
        />
        <span className="whitespace-nowrap text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {resultCount} citas · {resultIncome}
        </span>

        <span className="hidden sm:block mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

        <FilterDropdown
          icon={<Scissors size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
          placeholder="Todos los barberos"
          value={barberId}
          options={barbers}
          optionsCount={barbers.length}
          onChange={(v) => apply({ barberId: v })}
          ariaLabel="Filtrar por barbero"
        />

        <FilterDropdown
          icon={<UsersRound size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
          placeholder="Todos los servicios"
          value={serviceId}
          options={services}
          optionsCount={services.length}
          onChange={(v) => apply({ serviceId: v })}
          ariaLabel="Filtrar por servicio"
        />

        <FilterDropdown
          icon={<User size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
          placeholder="Todos los clientes"
          value={clientId}
          options={clients}
          optionsCount={clients.length}
          onChange={(v) => apply({ clientId: v })}
          ariaLabel="Filtrar por cliente"
        />

        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Limpiar filtros"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Quitar filtro: ${chip.label}`}
                className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
