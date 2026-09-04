"use client";
import { Bell, Menu, Plus, Search } from "lucide-react";
import { Session } from "@/types";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme/theme-toggle";

const roleLabel: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  BARBER: "Barbero",
  CLIENT: "Cliente",
};

export function Topbar({ session }: { session: Session }) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const title = pathname.split("/")[1] || "dashboard";
  const label: Record<string, string> = {
    dashboard: "Panel general",
    appointments: "Citas",
    clients: "Clientes",
    barbers: "Barberos",
    services: "Servicios",
    settings: "Configuración",
    visitantes: "Visitantes",
    manuales: "Manuales",
  };
  const initials = session.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 min-h-[70px] flex items-center justify-between px-4 sm:px-6 lg:px-7">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 grid place-items-center text-zinc-700 dark:text-zinc-300"
          onClick={() => window.dispatchEvent(new Event("toggle-sidebar"))}
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {label[title] || "Panel"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Gestiona la operación de tu negocio.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex h-9 w-56 rounded-lg border border-zinc-200 dark:border-zinc-700 items-center gap-2 px-3 bg-white dark:bg-zinc-900">
          <Search size={15} className="text-zinc-400 dark:text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Buscar..."
          />
          <kbd className="text-[9px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1">
            ⌘ K
          </kbd>
        </div>
        <button className="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-700 grid place-items-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <Bell size={16} />
        </button>
        <ThemeToggle />
        <Link
          href="/appointments?new=1"
          className="h-9 px-3 rounded-lg bg-zinc-950 dark:bg-gold dark:text-zinc-950 text-white text-xs font-semibold flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-gold-light transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nueva cita</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2.5 pl-2">
          <div className="h-9 w-9 rounded-full bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950 grid place-items-center text-[10px] font-bold">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold truncate max-w-[140px] text-zinc-900 dark:text-zinc-100">
              {session.name}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {roleLabel[session.role] ?? session.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}