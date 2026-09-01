import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { userAgent } from "next/server";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { visitSchema } from "@/lib/validations/visits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { detectOrganic, computeBounce } from "@/lib/visitors";

/**
 * Captura de visitantes anónimos desde la landing (público, sin auth).
 * - `type: "view"`     → upsert de la sesión con el fingerprint + registra la page_view.
 * - `type: "duration"` → acumula segundos en la sesión (beacon de salida).
 *
 * Sin persistencia de IP (anonimidad): la IP solo se usa transitoriamente en `rateLimit`.
 * La geo (país/ciudad) viene de headers de Vercel, gruesa y sin identificador personal.
 * Los bots se descartan para no contaminar la analítica.
 */
export async function POST(request: Request) {
  return withApi(async () => {
    const ipLimit = rateLimit(`visit:ip:${getClientIp(request)}`, 120, 60_000);
    if (!ipLimit.ok) {
      throw new DomainError(ErrorCodes.RATE_LIMITED, "Demasiadas visitas desde esta conexión.", 429);
    }

    const body = visitSchema.parse(await request.json().catch(() => null));

    const ua = userAgent(request);
    if (ua.isBot) return { data: { ok: false }, status: 201 };

    const fingerprint = body.fingerprint;
    if (!fingerprint) return { data: { ok: false }, status: 201 };

    const now = new Date();
    const country = request.headers.get("x-vercel-ip-country") ?? null;
    const city = request.headers.get("x-vercel-ip-city") ?? null;
    const referrer = body.referrer?.trim() ? body.referrer.trim() : null;
    const isOrganic = detectOrganic(referrer);

    if (body.type === "view") {
      const pagePath = body.path?.trim() || "/";
      const demographics = {
        country,
        city,
        device: ua.device?.type ?? null,
        browser: ua.browser?.name ?? null,
        os: ua.os?.name ?? null,
      };

      // La demografía y la fuente (referrer/isOrganic) se fijan en la CREACIÓN de la sesión
      // para no alterar la atribución original en navegaciones internas posteriores.
      // Se usa `upsert` (INSERT ... ON CONFLICT) en lugar de find+create para evitar la
      // carrera entre peticiones concurrentes con el mismo fingerprint (unique constraint).
      await prisma.$transaction(async (tx) => {
        const session = await tx.visitorSession.upsert({
          where: { fingerprint },
          create: {
            fingerprint,
            ...demographics,
            referrer,
            isOrganic,
            pagesViewed: 1,
            bounced: true,
            firstSeen: now,
            lastSeen: now,
          },
          update: {
            pagesViewed: { increment: 1 },
            lastSeen: now,
          },
          select: { id: true, pagesViewed: true },
        });

        await tx.visitorSession.update({
          where: { id: session.id },
          data: { bounced: computeBounce(session.pagesViewed) },
        });

        await tx.pageView.create({
          data: { sessionId: session.id, path: pagePath, referrer, isOrganic },
        });
      });
    } else if (body.type === "duration" && body.elapsedMs) {
      const seconds = Math.round(body.elapsedMs / 1000);
      if (seconds > 0) {
        await prisma.visitorSession.updateMany({
          where: { fingerprint },
          data: { duration: { increment: seconds }, lastSeen: now },
        });
      }
    }

    return { data: { ok: true }, status: 201 };
  });
}

