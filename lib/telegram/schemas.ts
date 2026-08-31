import { z } from "zod";

export const AppointmentEventSchema = z.object({
  appointmentId: z.string().cuid("ID de cita inválido"),
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  barberName: z.string().min(1, "El nombre del barbero es obligatorio"),
  serviceName: z.string().min(1, "El nombre del servicio es obligatorio"),
  startsAt: z.coerce.date(),
});
export type AppointmentEvent = z.infer<typeof AppointmentEventSchema>;

export const NotificationTypeSchema = z.enum([
  "APPOINTMENT_CREATED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_COMPLETED",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
