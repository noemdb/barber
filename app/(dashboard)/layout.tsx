import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { requireRoleOrRedirect } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRoleOrRedirect("OWNER", "ADMIN");
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const appointmentsToday = await prisma.appointment.count({
    where: { startsAt: { gte: dayStart, lt: dayEnd } },
  });

  const settings = await prisma.businessSettings.findFirst();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar
          session={session}
          appointmentsToday={appointmentsToday}
          businessName={settings?.businessName ?? "Barber Shop Central"}
          logoUrl={settings?.logoUrl}
        />
        <div className="main-content">
          <Topbar session={session} />
          <main className="p-4 sm:p-6 lg:p-7 pb-24 lg:pb-8">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
