import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";

/**
 * Backup lógico de la base de datos completa.
 * Solo OWNER/ADMIN. Lee todas las tablas en una única transacción (snapshot consistente)
 * y las devuelve como objeto `tables` para descargar en JSON. No modifica datos.
 *
 * OJO: el archivo incluye datos sensibles (hashes de contraseña, datos personales,
 * trazas de visitantes) — debe guardarse en un lugar seguro.
 */
export async function POST() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");

    const [user, barber, client, service, appointment, payment, businessSettings, businessHour, testimonial, binnacleEntry, visitorSession, pageView] =
      await prisma.$transaction([
        prisma.user.findMany(),
        prisma.barber.findMany(),
        prisma.client.findMany(),
        prisma.service.findMany(),
        prisma.appointment.findMany(),
        prisma.payment.findMany(),
        prisma.businessSettings.findMany(),
        prisma.businessHour.findMany(),
        prisma.testimonial.findMany(),
        prisma.binnacleEntry.findMany(),
        prisma.visitorSession.findMany(),
        prisma.pageView.findMany(),
      ]);

    return {
      data: {
        exportedAt: new Date().toISOString(),
        app: "barberservice",
        tables: {
          User: user,
          Barber: barber,
          Client: client,
          Service: service,
          Appointment: appointment,
          Payment: payment,
          BusinessSettings: businessSettings,
          BusinessHour: businessHour,
          Testimonial: testimonial,
          BinnacleEntry: binnacleEntry,
          VisitorSession: visitorSession,
          PageView: pageView,
        },
      },
      status: 200,
    };
  });
}
