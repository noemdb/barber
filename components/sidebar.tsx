"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, LayoutDashboard, LogOut, Scissors, Settings, Users, X } from "lucide-react";
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

export function Sidebar({ session, appointmentsToday }: { session: Session; appointmentsToday: number }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => { const fn = () => setOpen(true); window.addEventListener("toggle-sidebar", fn); return () => window.removeEventListener("toggle-sidebar", fn); }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }
  const navGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(session.role)) }))
    .filter((group) => group.items.length > 0);
  return <>
    <button className={`fixed inset-0 z-30 bg-black/30 lg:hidden ${open ? "block" : "hidden"}`} onClick={()=>setOpen(false)} aria-label="Cerrar menú" />
    <aside className={`fixed z-40 inset-y-0 left-0 w-[252px] bg-white border-r border-zinc-200 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center gap-3 px-2 py-2"><div className="h-9 w-9 rounded-xl bg-zinc-950 text-white grid place-items-center"><Scissors size={17}/></div><div className="flex-1"><div className="font-bold text-sm">BarberService</div><div className="text-[10px] text-zinc-500">Administración</div></div><button className="lg:hidden p-2 text-zinc-500" onClick={()=>setOpen(false)}><X size={18}/></button></div>
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 flex items-center gap-2.5"><div className="h-8 w-8 rounded-lg bg-white border border-zinc-200 grid place-items-center text-[10px] font-bold">BS</div><div className="min-w-0"><div className="text-[10px] text-zinc-500">Negocio</div><div className="text-xs font-semibold truncate">Barber Shop Central</div></div><ChevronDown className="ml-auto text-zinc-400" size={15}/></div>
        {navGroups.map((group) => (
          <div key={group.label} className="mt-6">
            <div className="text-[10px] font-bold tracking-[.14em] text-zinc-400 px-3">{group.label}</div>
            <nav className="mt-2 space-y-1">{group.items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${path===item.href ? "bg-zinc-100 text-zinc-950 font-semibold" : "text-zinc-600 hover:bg-zinc-50"}`}><item.icon size={17}/><span>{item.label}</span>{item.href === "/appointments" && appointmentsToday > 0 && <span className="ml-auto rounded-full bg-zinc-900 text-white text-[9px] px-1.5 py-0.5">{appointmentsToday}</span>}</Link>)}</nav>
          </div>
        ))}
        <div className="mt-auto border-t border-zinc-200 pt-3"><div className="flex items-center gap-2.5 px-2"><div className="h-8 w-8 rounded-full bg-zinc-200 grid place-items-center text-[10px] font-bold">{session.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div className="min-w-0 flex-1"><div className="text-xs font-semibold truncate">{session.name}</div><div className="text-[10px] text-zinc-500 truncate">{session.email}</div></div><button className="p-2 text-zinc-500 hover:text-zinc-900" onClick={logout}><LogOut size={16}/></button></div></div>
      </div>
    </aside>
  </>;
}

export function MobileMenuButton() { return null; }