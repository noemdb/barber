import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { getActiveBarbersByServiceId } from "@/lib/services/barber-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const service = await prisma.service.findFirst({ where: { id, active: true }, select: { id: true } });
    if (!service) throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);
    return { data: await getActiveBarbersByServiceId(id, prisma) };
  });
}
