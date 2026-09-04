import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Catálogos activos (barberos/servicios/clientes) usados por los filtros del
 * dashboard. Cambian rara vez: se cachean para no re-consultarlos en cada
 * request (el dashboard es force-dynamic).
 */
export const getActiveCatalogs = unstable_cache(
  async () => {
    const [barbers, services, clients] = await Promise.all([
      prisma.barber.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.service.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.client.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { barbers, services, clients };
  },
  ["dashboard-catalogs"],
  { revalidate: 300, tags: ["dashboard-catalogs"] },
);

/**
 * Ajustes de negocio (con horarios). Para la ocupación/horas pico del
 * dashboard; se cachean porque cambian solo desde el panel de settings.
 */
export const getDashboardSettings = unstable_cache(
  async () => prisma.businessSettings.findFirst({ include: { hours: true } }),
  ["dashboard-settings"],
  { revalidate: 300, tags: ["dashboard-settings"] },
);
