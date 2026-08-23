import { z } from "zod";

const optionalText = z
  .union([z.string().trim(), z.null()])
  .transform((value) => (value === "" || value === null ? null : value))
  .optional();

const optionalEmail = z
  .preprocess(
    (value) => (value === "" ? null : typeof value === "string" ? value.trim() : value),
    z.union([z.email("Correo electrónico inválido"), z.null()]).optional(),
  )
  .transform((value) => (value === "" ? null : value));

export const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.email("Correo electrónico inválido"),
  ),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.email("Correo electrónico inválido"),
  ),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const bookingSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.email("Correo electrónico inválido"),
  ),
  serviceId: z.string().min(1, "El servicio es obligatorio"),
  barberId: z.string().min(1, "El barbero es obligatorio"),
  startsAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Fecha de inicio inválida",
  }),
});

export const appointmentCreateSchema = z.object({
  clientId: z.string().min(1, "El cliente es obligatorio"),
  barberId: z.string().min(1, "El barbero es obligatorio"),
  serviceId: z.string().min(1, "El servicio es obligatorio"),
  startsAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Fecha de inicio inválida",
  }),
  notes: optionalText,
});

export const appointmentPatchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  notes: optionalText,
});

export const barberCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  phone: optionalText,
  email: optionalEmail,
  specialty: optionalText,
  avatar: z.string().url("El avatar debe ser una URL válida").optional(),
});

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  phone: optionalText,
  email: optionalEmail,
  notes: optionalText,
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: optionalText,
  durationMin: z.number().int("La duración debe ser un entero").positive("La duración debe ser positiva"),
  priceCents: z.number().int("El precio debe ser un entero").positive("El precio debe ser positivo"),
});

export const paymentCreateSchema = z.object({
  appointmentId: z.string().cuid("ID de cita inválido"),
  amountCents: z.number()
    .int("El monto debe ser un entero")
    .positive("El monto debe ser positivo")
    .optional(),
  method: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]).default("CASH"),
  status: z.enum(["PENDING", "PAID"]).default("PAID"),
  paidAt: z.coerce.date().optional(),
  completeAppointment: z.boolean().default(true),
});