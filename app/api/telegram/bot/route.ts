import { withApi } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import { getBotUsername } from "@/lib/telegram/bot";

/**
 * Devuelve el username del bot de Telegram (derivado del token vía getMe).
 * No expone el token; solo el username para construir enlaces seguros al bot.
 */
export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const username = await getBotUsername();
    return { data: { username } };
  });
}
