"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  BarChart3,
  Scissors,
  Settings,
  ShieldCheck,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { Markdown } from "@/components/manual/markdown";

type RoleTab = "admin" | "barber" | "client";

type Manuals = { admin: string; barber: string; client: string };

type PortalIdentity = {
  portal: string;
  roleLabel: string;
  badge: string;
  desc: string;
  icon: typeof ShieldCheck;
  nav: { label: string; icon: typeof ShieldCheck }[];
};

// Identidad de cada interfaz — mismos iconos y etiquetas que los shells/sidebar reales,
// para que el manual "se vea" como la interfaz que documenta.
const PORTALS: Record<RoleTab, PortalIdentity> = {
  admin: {
    portal: "Consola de administración",
    roleLabel: "Dueño · Administrador",
    badge: "OWNER · ADMIN",
    desc: "La consola completa del negocio: operación, catálogos, usuarios, bitácora y visitantes.",
    icon: ShieldCheck,
    nav: [
      { label: "Panel", icon: LayoutDashboard },
      { label: "Citas", icon: CalendarDays },
      { label: "Clientes", icon: Users },
      { label: "Barberos", icon: Scissors },
      { label: "Servicios", icon: ClipboardList },
      { label: "Configuración", icon: Settings },
      { label: "Usuarios", icon: UserCog },
      { label: "Bitácora", icon: ShieldCheck },
      { label: "Visitantes", icon: BarChart3 },
      { label: "Manuales", icon: BookOpen },
    ],
  },
  barber: {
    portal: "Portal del barbero",
    roleLabel: "Barbero",
    badge: "BARBER",
    desc: "La agenda y el desempeño de tu jornada: tus citas, tus clientes y tu bitácora.",
    icon: Scissors,
    nav: [
      { label: "Panel", icon: LayoutDashboard },
      { label: "Citas", icon: CalendarDays },
      { label: "Clientes", icon: Users },
      { label: "Bitácora", icon: ShieldCheck },
    ],
  },
  client: {
    portal: "Portal del cliente",
    roleLabel: "Cliente",
    badge: "CLIENT",
    desc: "Tus reservas, el historial y la verificación de horarios disponibles del negocio.",
    icon: User,
    nav: [
      { label: "Mis reservas", icon: CalendarDays },
      { label: "Bitácora", icon: ShieldCheck },
    ],
  },
};

export function ManualTabs({ manuals }: { manuals: Manuals }) {
  const [active, setActive] = useState<RoleTab>("admin");
  const portal = PORTALS[active];
  const Icon = portal.icon;

  return (
    <div className="space-y-6">
      {/* ── Hero con identidad ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-gold/10 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gold/15 blur-3xl dark:bg-gold/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-gold dark:bg-gold dark:text-zinc-950">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Manuales de usuario
              </h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                Guías de uso para cada rol del sistema. Cada manual comparte la identidad visual de la
                interfaz que documenta.
              </p>
            </div>
          </div>
                  </div>
      </div>

      {/* ── Tarjetas de portal (tabs) ──────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.entries(PORTALS) as [RoleTab, PortalIdentity][]).map(([id, p]) => {
          const CardIcon = p.icon;
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              aria-pressed={isActive}
              className={`group rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                isActive
                  ? "border-gold bg-white shadow-sm dark:bg-zinc-900"
                  : "border-zinc-200 bg-white/50 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-gold text-zinc-950"
                      : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <CardIcon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.portal}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.roleLabel}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{p.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ── Panel del portal activo (identidad real + contenido) ───────── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-950 text-gold dark:bg-gold dark:text-zinc-950">
                <Icon size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {portal.portal} — manual
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Acceso: <span className="font-mono">{portal.badge}</span>
                </div>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {portal.nav.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <item.icon size={12} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 dark:bg-zinc-950 sm:p-8">
          <Markdown key={active} source={manuals[active]} />
        </div>
      </div>
    </div>
  );
}
