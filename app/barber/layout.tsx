import { prisma } from "@/lib/prisma";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { getCurrentBarber } from "@/lib/scope";
import { BarberShell } from "@/components/barber/barber-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default async function BarberLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRoleOrRedirect("BARBER");
  const settings = await prisma.businessSettings.findFirst();
  const barber = await getCurrentBarber(session.sub);

  if (!barber) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 grid place-items-center p-6">
          <div className="max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">Perfil sin vincular</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Tu cuenta de usuario no está asociada a un barbero. Contacta al administrador para
              habilitar tu portal.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BarberShell
        session={session}
        businessName={settings?.businessName ?? "Barber Shop Central"}
        logoUrl={settings?.logoUrl}
      >
        {children}
      </BarberShell>
    </ThemeProvider>
  );
}
