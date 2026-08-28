import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ThemeProvider } from "@/components/theme/theme-provider";

function ThemeScript() {
  // Inline script to set the theme before the first paint (no FOUC).
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var theme = window.localStorage.getItem("theme");
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`,
      }}
    />
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/");
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
      <ThemeScript />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar
          session={session}
          appointmentsToday={appointmentsToday}
          businessName={settings?.businessName ?? "Barber Shop Central"}
          logoUrl={settings?.logoUrl}
        />
        <div className="lg:ml-[252px]">
          <Topbar session={session} />
          <main className="p-4 sm:p-6 lg:p-7 pb-24 lg:pb-8">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}