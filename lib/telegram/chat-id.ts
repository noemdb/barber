import { prisma } from "@/lib/prisma";

/**
 * Resuelve el chat_id de destino de las notificaciones.
 * Prioridad: valor guardado en BusinessSettings > variable de entorno TELEGRAM_CHAT_ID.
 * Devuelve null si ninguno está definido.
 */
export async function getTelegramChatId(): Promise<string | null> {
  const settings = await prisma.businessSettings.findFirst({
    select: { telegramChatId: true },
  });
  return settings?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID ?? null;
}
