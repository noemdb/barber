import { prisma } from "@/lib/prisma";

export interface TelegramBusiness {
  address: string | null;
  mapsUrl: string | null;
  currency: string | null;
}

/**
 * Resuelve la información de negocio que se incluye en las notificaciones de
 * Telegram (ubicación, enlace de Google Maps y moneda). Se consulta en cada
 * envío porque los ajustes pueden cambiar desde el panel de administración.
 */
export async function getTelegramBusiness(): Promise<TelegramBusiness> {
  const settings = await prisma.businessSettings.findFirst({
    select: { address: true, mapsUrl: true, currency: true },
  });
  return {
    address: settings?.address ?? null,
    mapsUrl: settings?.mapsUrl ?? null,
    currency: settings?.currency ?? null,
  };
}
