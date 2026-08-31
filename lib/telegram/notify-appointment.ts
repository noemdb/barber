import { getBusinessTimezone } from "@/lib/time";
import { getTelegramChatId } from "./chat-id";
import { sendTelegramMessage } from "./notifier";
import { buildNotificationText } from "./templates";
import {
  AppointmentEventSchema,
  NotificationTypeSchema,
  type AppointmentEvent,
  type NotificationType,
} from "./schemas";

export async function notifyAppointmentEvent(
  rawType: NotificationType,
  rawEvent: AppointmentEvent
): Promise<void> {
  const type = NotificationTypeSchema.parse(rawType);
  const event = AppointmentEventSchema.parse(rawEvent);

  const chatId = await getTelegramChatId();
  if (!chatId) {
    console.error("[telegram] sin chat_id configurado (settings o TELEGRAM_CHAT_ID), se omite notificación");
    return;
  }

  const timeZone = await getBusinessTimezone();
  const text = buildNotificationText(type, event, { timeZone });
  const result = await sendTelegramMessage(chatId, text);

  if (!result.ok) {
    console.error(
      `[telegram] no se pudo enviar notificación ${type} (cita ${event.appointmentId}): ${result.errorReason}`
    );
  }
}
