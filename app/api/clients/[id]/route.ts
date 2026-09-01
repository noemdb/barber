import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { getBusinessTimezone } from "@/lib/time";

/**
 * Perfil completo de un cliente: datos básicos + historial de citas (con servicio, barbero y
 * pago) e indicadores agregados. Solo OWNER/ADMIN. Se usa en el diálogo «Visualizar» de /clients.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true, barber: true, payment: true },
          orderBy: { startsAt: "desc" },
        },
      },
    });
    if (!client) throw new DomainError(ErrorCodes.NOT_FOUND, "Cliente no encontrado", 404);

    const { appointments, ...profile } = client;

    const count = (status: string) => appointments.filter((a) => a.status === status).length;
    const paid = appointments.filter((a) => a.payment?.status === "PAID");
    const totalSpentCents = paid.reduce((sum, a) => sum + (a.payment?.amountCents ?? 0), 0);
    const completed = appointments.filter((a) => a.status === "COMPLETED");

    const stats = {
      totalAppointments: appointments.length,
      completed: count("COMPLETED"),
      confirmed: count("CONFIRMED"),
      pending: count("PENDING"),
      cancelled: count("CANCELLED"),
      noShow: count("NO_SHOW"),
      totalSpentCents,
      averageSpendCents: paid.length ? Math.round(totalSpentCents / paid.length) : 0,
      lastVisit: completed[0]?.startsAt ?? null,
      firstVisit: completed[completed.length - 1]?.startsAt ?? null,
    };

    const timezone = await getBusinessTimezone();

    return { data: { client: profile, appointments, stats, timezone } };
  });
}
