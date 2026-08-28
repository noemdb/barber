import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LandingNav from "@/components/landing/nav";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.businessSettings.findFirst();
  const businessName = settings?.businessName ?? "BarberService";

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Site navbar (fixed) — always visible */}
      <LandingNav businessName={businessName} logoUrl={settings?.logoUrl} />

      {/* Content — padded below the fixed nav */}
      <article className="mx-auto max-w-4xl px-6 pb-12 pt-28">{children}</article>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-6 text-xs text-zinc-400 dark:text-zinc-500">
          Documento generado en {new Date().toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" })}.
        </div>
      </footer>
    </div>
  );
}
