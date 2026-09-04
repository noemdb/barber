"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CalendarDays, LogOut, Scissors, ShieldCheck } from "lucide-react";
import type { Session } from "@/types";

const nav = [
  { href: "/reservations", label: "Mis reservas", icon: CalendarDays },
  { href: "/reservations/binnacle", label: "Bitácora", icon: ShieldCheck },
  { href: "/reservations/manual", label: "Manual", icon: BookOpen },
];

export function ClientShell({
  session,
  businessName,
  logoUrl,
  children,
}: {
  session: Session;
  businessName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const initials = session.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-950 text-white dark:bg-gold dark:text-zinc-950">
              {logoUrl ? (
                <Image src={logoUrl} alt={businessName} width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                <Scissors size={17} />
              )}
            </div>
            <div>
              <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{businessName}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Portal del cliente</div>
            </div>
          </div>
          <nav className="ml-auto flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  path === item.href
                    ? "bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <item.icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 dark:border-zinc-800">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {initials}
            </div>
            <button
              onClick={logout}
              className="p-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
