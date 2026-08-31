import { z } from "zod";

export const HH24_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/\S+$/;

const nullableText = z.string().trim().nullable();

const urlText = z
  .string()
  .trim()
  .refine((v) => v === "" || URL_REGEX.test(v), { message: "Debe ser una URL válida (http/https)" })
  .nullable();

const emailText = z
  .string()
  .trim()
  .refine((v) => v === "" || EMAIL_REGEX.test(v), { message: "Debe ser un correo válido" })
  .nullable();

const timezoneSchema = z
  .string()
  .trim()
  .refine((tz) => {
    try {
      return Intl.supportedValuesOf("timeZone").includes(tz);
    } catch {
      return true;
    }
  }, { message: "Zona horaria no válida" });

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((c) => c.length === 3, { message: "Moneda debe ser un código ISO de 3 letras" });

export const SettingsUpdateInput = z.object({
  businessName: z.string().trim().min(1).optional(),
  tagline: nullableText.optional(),
  description: nullableText.optional(),
  logoUrl: urlText.optional(),
  faviconUrl: urlText.optional(),
  heroImageUrl: urlText.optional(),
  phone: nullableText.optional(),
  email: emailText.optional(),
  whatsapp: nullableText.optional(),
  address: nullableText.optional(),
  mapsUrl: urlText.optional(),
  instagramUrl: urlText.optional(),
  facebookUrl: urlText.optional(),
  currency: currencySchema.optional(),
  timezone: timezoneSchema.optional(),
  appointmentSlot: z.number().int().min(5).max(240).optional(),
  telegramChatId: nullableText.optional(),
  businessHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string().trim().regex(HH24_REGEX, "Hora inválida (HH:mm)").nullable(),
        closeTime: z.string().trim().regex(HH24_REGEX, "Hora inválida (HH:mm)").nullable(),
      }),
    )
    .refine((items) => new Set(items.map((i) => i.dayOfWeek)).size === items.length, {
      message: "No se permiten días duplicados",
    })
    .refine(
      (items) => items.every((i) => (i.openTime === null) === (i.closeTime === null)),
      { message: "La hora de apertura y cierre deben venir juntas (o ambas vacías)" },
    )
    .optional(),
  testimonials: z
    .array(
      z.object({
        author: z.string().trim().min(1),
        role: nullableText,
        quote: z.string().trim().min(1),
        rating: z.number().int().min(1).max(5),
        order: z.number().int().min(0),
      }),
    )
    .optional(),
});

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateInput>;
export type BusinessHoursInput = SettingsUpdateInput["businessHours"];
export type TestimonialsInput = SettingsUpdateInput["testimonials"];
