import type { Appointment, Barber, Client, Service } from "@/app/generated/prisma/client";
import type { AppointmentEvent } from "./schemas";

export type AppointmentWithRelations = Appointment & {
  client: Client;
  barber: Barber;
  service: Service;
};

export function toTelegramEvent(appointment: AppointmentWithRelations): AppointmentEvent {
  return {
    appointmentId: appointment.id,
    clientName: appointment.client.name,
    barberName: appointment.barber.name,
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt,
  };
}
