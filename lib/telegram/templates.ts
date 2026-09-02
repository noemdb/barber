import type { AppointmentEvent, NotificationType } from "./schemas";
import { money } from "@/lib/format";

export interface NotificationBusiness {
  address?: string | null;
  mapsUrl?: string | null;
  currency?: string | null;
}

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

function buildAppointmentBody(
  event: AppointmentEvent,
  when: string,
  currency: string,
  business?: NotificationBusiness
): string {
  const barber = event.barberSpecialty
    ? `${event.barberName} (${event.barberSpecialty})`
    : event.barberName;
  const price = money(event.servicePriceCents, currency);
  const service = `${event.serviceName} · ${event.serviceDurationMin} min · ${price}`;

  const lines = [
    `Cliente: ${event.clientName}`,
    `Barbero: ${barber}`,
    `Servicio: ${service}`,
    `Fecha: ${when}`,
  ];

  if (business?.address) lines.push(`📍 Ubicación: ${business.address}`);
  if (business?.mapsUrl) lines.push(`🗺️ <a href="${business.mapsUrl}">Ver en Google Maps</a>`);

  return lines.join("\n");
}

export function buildNotificationText(
  type: NotificationType,
  event: AppointmentEvent,
  options?: { timeZone?: string; business?: NotificationBusiness }
): string {
  const tz = options?.timeZone ?? "America/Caracas";
  const when = formatDateTime(event.startsAt, tz);
  const currency = options?.business?.currency ?? "USD";
  const body = buildAppointmentBody(event, when, currency, options?.business);

  switch (type) {
    case "APPOINTMENT_CREATED":
      return `🆕 <b>Nueva cita registrada</b>\n${body}`;
    case "APPOINTMENT_CONFIRMED":
      return `✅ <b>Cita confirmada</b>\n${body}`;
    case "APPOINTMENT_COMPLETED":
      return `✂️ <b>Servicio completado</b>\n${body}`;
  }
}
