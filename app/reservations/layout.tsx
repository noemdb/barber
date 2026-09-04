import { prisma } from "@/lib/prisma";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { ClientShell } from "@/components/client/client-shell";

export default async function ReservationsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRoleOrRedirect("CLIENT");
  const settings = await prisma.businessSettings.findFirst();

  return (
    <ClientShell
      session={session}
      businessName={settings?.businessName ?? "BarberService"}
      logoUrl={settings?.logoUrl}
    >
      {children}
    </ClientShell>
  );
}
