import { z } from "zod";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createOrRefreshHold } from "@/lib/services/slot-hold";
import { prisma } from "@/lib/prisma";

const holdSchema = z.object({
  barberId: z.string().min(1, "El barbero es obligatorio"),
  serviceId: z.string().min(1, "El servicio es obligatorio"),
  startsAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Fecha de inicio inválida",
  }),
  durationMin: z.number().int().positive("Duración inválida"),
  token: z.string().min(1, "Falta el token de la reserva"),
});

export async function POST(request: Request) {
  return withApi(async () => {
    const ipLimit = rateLimit(`hold:ip:${getClientIp(request)}`, 30, 60_000);
    if (!ipLimit.ok) {
      throw new DomainError(ErrorCodes.RATE_LIMITED, "Demasiadas solicitudes. Inténtalo en unos minutos.", 429);
    }

    const body = holdSchema.parse(await request.json().catch(() => null));
    const assignment = await prisma.barberService.findUnique({
      where: { barberId_serviceId: { barberId: body.barberId, serviceId: body.serviceId } },
      include: {
        barber: { select: { active: true } },
        service: { select: { active: true, durationMin: true } },
      },
    });
    if (!assignment?.barber.active || !assignment.service.active) {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El barbero no ofrece este servicio", 400);
    }
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(startsAt.getTime() + assignment.service.durationMin * 60_000);

    await createOrRefreshHold({ barberId: body.barberId, startsAt, endsAt, token: body.token });

    return { data: { ok: true } };
  });
}
