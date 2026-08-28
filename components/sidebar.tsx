"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Session } from "@/types";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: string[] };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "GESTIÓN",
    items: [
      { href: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "BARBER"] },
      { href: "/appointments", label: "Citas", icon: CalendarDays, roles: ["OWNER", "ADMIN", "BARBER"] },
      { href: "/clients", label: "Clientes", icon: Users, roles: ["OWNER", "ADMIN", "BARBER"] },
      { href: "/barbers", label: "Barberos", icon: Scissors, roles: ["OWNER", "ADMIN"] },
      { href: "/services", label: "Servicios", icon: Scissors, roles: ["OWNER", "ADMIN"] },
    ],
  },
  {
    label: "NEGOCIO",
    items: [{ href: "/settings", label: "Configuración", icon: Settings, roles: ["OWNER", "ADMIN"] }],
  },
];

export function Sidebar({
  session,
  appointmentsToday,
  businessName,
  logoUrl,
}: {
  session: Session;
  appointmentsToday: number;
  businessName: string;
  logoUrl?: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setOpen(true);
    window.addEventListener("toggle-sidebar", fn);
    return () => window.removeEventListener("toggle-sidebar", fn);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(session.role)) }))
    .filter((group) => group.items.length > 0);

  const initials = session.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      <button
        className={`fixed inset-0 z-30 bg-black/30 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
        aria-label="Cerrar menú"
      />
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-[252px] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-950 dark:bg-gold text-white dark:text-zinc-950">
              {logoUrl ? (
                <Image src={logoUrl} alt={businessName} width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                <Scissors size={17} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-sm text-zinc-900 dark:text-zinc-100">{businessName}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Administración</div>
            </div>
            <button className="lg:hidden p-2 text-zinc-500 dark:text-zinc-400" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Business selector */}
          <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2.5 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 grid place-items-center text-[10px] font-bold text-zinc-950 dark:text-zinc-100">
              BS
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Negocio</div>
              <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {businessName}
              </div>
            </div>
            <ChevronDown className="ml-auto text-zinc-400 dark:text-zinc-500" size={15} />
          </div>

          {/* Navigation */}
          {navGroups.map((group) => (
            <div key={group.label} className="mt-6">
              <div className="text-[10px] font-bold tracking-[.14em] text-zinc-400 dark:text-zinc-500 px-3">
                {group.label}
              </div>
              <nav className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      path === item.href
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                    {item.href === "/appointments" && appointmentsToday > 0 && (
                      <span className="ml-auto rounded-full bg-zinc-900 dark:bg-gold text-white dark:text-zinc-950 text-[9px] px-1.5 py-0.5 font-medium">
                        {appointmentsToday}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          {/* User section */}
          <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 grid place-items-center text-[10px] font-bold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                  {session.name}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{session.email}</div>
              </div>
              <button
                className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                onClick={logout}
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton() {
  return null;
}