import type { AppointmentEvent, NotificationType } from "./schemas";

function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildNotificationText(
  type: NotificationType,
  event: AppointmentEvent,
  options?: { timeZone?: string }
): string {
  const tz = options?.timeZone ?? "America/Caracas";
  const when = formatDateTime(event.startsAt, tz);

  switch (type) {
    case "APPOINTMENT_CREATED":
      return (
        `🆕 <b>Nueva cita registrada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.serviceName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_CONFIRMED":
      return (
        `✅ <b>Cita confirmada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.serviceName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_COMPLETED":
      return (
        `✂️ <b>Servicio completado</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Servicio: ${event.serviceName}`
      );
  }
}
