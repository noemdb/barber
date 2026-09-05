import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { getActiveServicesByBarberId } from "@/lib/services/barber-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const barber = await prisma.barber.findFirst({ where: { id, active: true }, select: { id: true } });
    if (!barber) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);
    return { data: await getActiveServicesByBarberId(id, prisma) };
  });
}
