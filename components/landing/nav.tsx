"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Scissors, X } from "lucide-react";

const links = [
  { label: "Servicios", href: "#servicios" },
  { label: "Equipo", href: "#equipo" },
  { label: "Experiencia", href: "#experiencia" },
  { label: "Contacto", href: "#contacto" },
];

export default function LandingNav({ businessName, logoUrl }: { businessName: string; logoUrl?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-zinc-950/85 backdrop-blur-md" : "bg-transparent"}`}
    >
      <nav className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-gold/40 bg-gold/10 text-gold">
            {logoUrl ? (
              <Image src={logoUrl} alt={businessName} width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              <Scissors size={16} />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-base font-semibold uppercase tracking-tight">{businessName}</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Barber &amp; Styling</div>
          </div>
        </Link>

        <div className="hidden items-center gap-7 text-[13px] text-zinc-400 md:flex">
          {links.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-gold">
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-gold/50 px-4 py-2 text-[13px] font-semibold text-gold transition-colors hover:bg-gold hover:text-zinc-950 sm:block"
          >
            Iniciar sesión
          </Link>
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setOpen(!open)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-[13px] text-zinc-300 transition-colors hover:text-gold"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-full bg-gold px-5 py-2.5 text-center text-[13px] font-semibold text-zinc-950"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}