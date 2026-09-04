"use client";

import { useState } from "react";
import { BookOpen, Scissors, ShieldCheck, User } from "lucide-react";
import { Markdown } from "@/components/manual/markdown";

type RoleTab = "admin" | "barber" | "client";

type Manuals = { admin: string; barber: string; client: string };

const TABS: { id: RoleTab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "admin", label: "Administrador", icon: ShieldCheck },
  { id: "barber", label: "Barbero", icon: Scissors },
  { id: "client", label: "Cliente", icon: User },
];

export function ManualTabs({ manuals }: { manuals: Manuals }) {
  const [active, setActive] = useState<RoleTab>("admin");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <BookOpen size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Manuales de usuario</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Guías de uso para cada rol del sistema. Selecciona una pestaña para consultar su manual.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-pressed={isActive}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-gold dark:text-zinc-950 dark:hover:bg-gold-light"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <Markdown key={active} source={manuals[active]} />
      </div>
    </div>
  );
}
