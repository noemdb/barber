import { getBusinessTimezone } from "@/lib/time";
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

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error("[telegram] TELEGRAM_CHAT_ID no configurado, se omite notificación");
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
