import { withApi } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import { getTelegramChatId } from "@/lib/telegram/chat-id";
import { sendTelegramMessage } from "@/lib/telegram/notifier";
import { getBusinessTimezone } from "@/lib/time";

type TestTelegramResult = {
  ok: boolean;
  reason: string | null;
  errorCode?: number | null;
  chatId: string | null;
  source: string;
  tokenConfigured: boolean;
  message: string;
};

/**
 * Envía un mensaje de prueba por Telegram para diagnosticar por qué no llegan
 * las notificaciones. Reporta, sin lanzar errores, qué está mal:
 *  - token del bot vacío
 *  - chat_id no configurado (ni settings ni TELEGRAM_CHAT_ID)
 *  - Telegram rechazó el envío (403/chat not found/red/desconocido)
 *
 * El chat_id a probar se puede sobreescribir con `{ chatId }` para probar el
 * valor que se acaba de tipear en el formulario sin necesidad de guardarlo.
 */
export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");

    const body = (await request.json().catch(() => ({}))) as { chatId?: unknown };
    const overrideChatId =
      typeof body?.chatId === "string" && body.chatId.trim() ? body.chatId.trim() : null;

    const tokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    const effectiveChatId = await getTelegramChatId();
    const chatId = overrideChatId ?? effectiveChatId;
    const source = overrideChatId
      ? "manual (formulario)"
      : effectiveChatId
        ? "configurado"
        : "ninguna";
    const timezone = await getBusinessTimezone();

    let payload: TestTelegramResult;

    if (!tokenConfigured) {
      payload = {
        ok: false,
        reason: "TOKEN_MISSING",
        chatId,
        source,
        tokenConfigured,
        message:
          "TELEGRAM_BOT_TOKEN no está configurado. Añade el token del bot en el .env y reinicia el servidor.",
      };
    } else if (!chatId) {
      payload = {
        ok: false,
        reason: "NO_CHAT_ID",
        chatId: null,
        source,
        tokenConfigured,
        message:
          "No hay chat_id configurado (ni en ajustes ni en TELEGRAM_CHAT_ID). Escribe uno en el campo y vuelve a probar.",
      };
    } else {
      const when = new Intl.DateTimeFormat("es-VE", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());

      const text =
        `🔔 <b>Mensaje de prueba</b>\n` +
        `Si ves esto, las notificaciones por Telegram funcionan.\n` +
        `Hora del negocio: ${when}`;

      const result = await sendTelegramMessage(chatId, text);

      payload = {
        ok: result.ok,
        reason: result.errorReason ?? null,
        errorCode: result.errorCode ?? null,
        chatId,
        source,
        tokenConfigured,
        message: result.ok
          ? "Mensaje de prueba enviado correctamente."
          : `No se pudo enviar (${result.errorReason ?? "error"}). Verifica que el bot sea miembro del chat y que el chat_id sea el correcto.`,
      };
    }

    return { data: payload };
  });
}
