import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { resetBusinessTimezoneCache } from "@/lib/time";
import { dbDumpSchema } from "@/lib/validations/db";

/**
 * Restaura la base de datos desde un backup generado por `POST /api/db/backup`.
 * Solo OWNER/ADMIN. Reemplaza el contenido actual de TODAS las tablas por el del archivo:
 * primero vacía todo (hijos → padres) y luego reinserta (padres → hijos) dentro de una única
 * transacción, preservando los `id` del backup para conservar las relaciones.
 *
 * OJO: es una operación destructiva — el estado actual se descarta. Incluye datos sensibles
 * (hashes de contraseña, datos personales, trazas de visitantes); el archivo debe ser legítimo.
 */
export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");

    const raw = await request.json().catch(() => null);
    const parsed = dbDumpSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El archivo de backup no es válido", 400);
    }

    const tables = parsed.data.tables ?? {};
    // Mapeo modelo → filas del backup (claves en mayúscula tal como se exportan).
    const rows = {
      user: tables.User ?? [],
      businessSettings: tables.BusinessSettings ?? [],
      client: tables.Client ?? [],
      service: tables.Service ?? [],
      barber: tables.Barber ?? [],
      businessHour: tables.BusinessHour ?? [],
      testimonial: tables.Testimonial ?? [],
      binnacleEntry: tables.BinnacleEntry ?? [],
      appointment: tables.Appointment ?? [],
      payment: tables.Payment ?? [],
      visitorSession: tables.VisitorSession ?? [],
      pageView: tables.PageView ?? [],
    };

    const restored: Record<string, number> = {};
    // Inserta solo si hay filas; cuenta lo realmente creado.
    const put = async (name: string, data: Record<string, unknown>[], run: () => Promise<{ count: number }>) => {
      restored[name] = data.length ? (await run()).count : 0;
    };

    try {
      await prisma.$transaction(async (tx) => {
        // 1) Vaciar (hijos antes que padres, para respetar las FKs → Evitar Restrict).
        await tx.payment.deleteMany();
        await tx.appointment.deleteMany();
        await tx.businessHour.deleteMany();
        await tx.testimonial.deleteMany();
        await tx.barber.deleteMany();
        await tx.client.deleteMany();
        await tx.service.deleteMany();
        await tx.user.deleteMany();
        await tx.visitorSession.deleteMany();
        await tx.pageView.deleteMany();
        await tx.binnacleEntry.deleteMany();
        await tx.businessSettings.deleteMany();

        // 2) Reinsertar (padres antes que hijos), preservando los `id` del backup.
        await put("User", rows.user, () => tx.user.createMany({ data: rows.user as Prisma.UserCreateManyInput[] }));
        await put("BusinessSettings", rows.businessSettings, () => tx.businessSettings.createMany({ data: rows.businessSettings as Prisma.BusinessSettingsCreateManyInput[] }));
        await put("Client", rows.client, () => tx.client.createMany({ data: rows.client as Prisma.ClientCreateManyInput[] }));
        await put("Service", rows.service, () => tx.service.createMany({ data: rows.service as Prisma.ServiceCreateManyInput[] }));
        await put("Barber", rows.barber, () => tx.barber.createMany({ data: rows.barber as Prisma.BarberCreateManyInput[] }));
        await put("BusinessHour", rows.businessHour, () => tx.businessHour.createMany({ data: rows.businessHour as Prisma.BusinessHourCreateManyInput[] }));
        await put("Testimonial", rows.testimonial, () => tx.testimonial.createMany({ data: rows.testimonial as Prisma.TestimonialCreateManyInput[] }));
        await put("BinnacleEntry", rows.binnacleEntry, () => tx.binnacleEntry.createMany({ data: rows.binnacleEntry as Prisma.BinnacleEntryCreateManyInput[] }));
        await put("Appointment", rows.appointment, () => tx.appointment.createMany({ data: rows.appointment as Prisma.AppointmentCreateManyInput[] }));
        await put("Payment", rows.payment, () => tx.payment.createMany({ data: rows.payment as Prisma.PaymentCreateManyInput[] }));
        await put("VisitorSession", rows.visitorSession, () => tx.visitorSession.createMany({ data: rows.visitorSession as Prisma.VisitorSessionCreateManyInput[] }));
        await put("PageView", rows.pageView, () => tx.pageView.createMany({ data: rows.pageView as Prisma.PageViewCreateManyInput[] }));
      });
    } catch (err) {
      throw new DomainError(
        ErrorCodes.INTERNAL_ERROR,
        `No se pudo restaurar: ${err instanceof Error ? err.message : "error desconocido"}`,
        500,
      );
    }

    // La zona horaria o la configuración pudieron cambiar; invalidar la caché de tiempo.
    resetBusinessTimezoneCache();

    return { data: { restored }, status: 200 };
  });
}
