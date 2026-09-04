"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Scissors, User, UsersRound, X } from "lucide-react";
import { FilterDropdown } from "./filter-dropdown";

type Option = { id: string; name: string };

const RANGES: { value: string; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
];

// El rango por defecto no lleva parámetro en la URL.
const DEFAULT_RANGE = "week";

type Props = {
  range: string;
  barberId: string;
  serviceId: string;
  clientId: string;
  barbers: Option[];
  services: Option[];
  clients: Option[];
};

export function DashboardFilters({ range, barberId, serviceId, clientId, barbers, services, clients }: Props) {
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

  const go = (next: { barberId?: string; serviceId?: string; clientId?: string }) => router.push(build(next));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-sm">
      <span className="hidden sm:flex items-center gap-1.5 pl-2 pr-0.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
        <CalendarRange size={14} />
        Periodo
      </span>
      {RANGES.map((r) => {
        const active = range === r.value;
        return (
          <Link
            key={r.value}
            href={build({ range: r.value })}
            role="tab"
            aria-selected={active}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {r.label}
          </Link>
        );
      })}

      <span className="hidden sm:block mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

      <FilterDropdown
        icon={<Scissors size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
        placeholder="Todos los barberos"
        value={barberId}
        options={barbers}
        optionsCount={barbers.length}
        onChange={(v) => go({ barberId: v })}
        ariaLabel="Filtrar por barbero"
      />

      <FilterDropdown
        icon={<UsersRound size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
        placeholder="Todos los servicios"
        value={serviceId}
        options={services}
        optionsCount={services.length}
        onChange={(v) => go({ serviceId: v })}
        ariaLabel="Filtrar por servicio"
      />

      <FilterDropdown
        icon={<User size={13} className="shrink-0 text-zinc-600 dark:text-zinc-300" />}
        placeholder="Todos los clientes"
        value={clientId}
        options={clients}
        optionsCount={clients.length}
        onChange={(v) => go({ clientId: v })}
        ariaLabel="Filtrar por cliente"
      />

      {(barberId || serviceId || clientId) && (
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Limpiar filtros"
        >
          <X size={13} />
          Limpiar
        </button>
      )}
    </div>
  );
}
