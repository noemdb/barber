import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return withApi(async () => {
    const ipLimit = rateLimit(`booking-lookup:ip:${getClientIp(request)}`, 60, 60_000);

    const url = new URL(request.url);
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
    const validEmail = ipLimit.ok && email && email.includes("@");

    const client = validEmail
      ? await prisma.client.findFirst({
          where: { email, active: true },
          select: { name: true, phone: true },
        })
      : null;

    return {
      data: {
        exists: Boolean(client),
        name: client?.name ?? null,
        phone: client?.phone ?? null,
      },
    };
  });
}
