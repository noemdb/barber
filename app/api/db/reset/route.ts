import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";

/**
 * Reinicio (borrado) de las tablas de operación del negocio.
 * Solo OWNER/ADMIN. Las tablas se vacían en orden FK-safe (hijos antes que padres)
 * dentro de una única transacción: Payment (hijo de Appointment) → Appointment →
 * Client/Barber/Service → BusinessHour. Se conservan BusinessSettings, User y
 * Testimonial. No admite deshacer.
 */
export async function POST() {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");

    const [payment, appointment, client, barber, service, businessHour] = await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.client.deleteMany(),
      prisma.barber.deleteMany(),
      prisma.service.deleteMany(),
      prisma.businessHour.deleteMany(),
    ]);

    return {
      data: {
        deleted: {
          payment: payment.count,
          appointment: appointment.count,
          client: client.count,
          barber: barber.count,
          service: service.count,
          businessHour: businessHour.count,
        },
      },
      status: 200,
    };
  });
}
