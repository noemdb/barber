import { z } from "zod";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createOrRefreshHold } from "@/lib/services/slot-hold";

const holdSchema = z.object({
  barberId: z.string().min(1, "El barbero es obligatorio"),
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
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(startsAt.getTime() + body.durationMin * 60_000);

    await createOrRefreshHold({ barberId: body.barberId, startsAt, endsAt, token: body.token });

    return { data: { ok: true } };
  });
}
