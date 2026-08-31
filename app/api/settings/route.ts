import { prisma } from "@/lib/prisma";
import { requireRole, requireStaff } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { SettingsUpdateInput } from "@/lib/settings.schema";
import { resetBusinessTimezoneCache } from "@/lib/time";

const DEFAULT_ID = "settings";

function telegramChatPayload(settings: { telegramChatId: string | null } | null) {
  const envChatId = process.env.TELEGRAM_CHAT_ID ?? null;
  return {
    telegramEnvChatId: envChatId,
    telegramEffectiveChatId: settings?.telegramChatId ?? envChatId,
  };
}

async function fetchSettingsPayload(id: string) {
  const [settings, businessHours, testimonials] = await Promise.all([
    prisma.businessSettings.findUnique({ where: { id } }),
    prisma.businessHour.findMany({ where: { businessId: id }, orderBy: { dayOfWeek: "asc" } }),
    prisma.testimonial.findMany({ where: { businessId: id }, orderBy: { order: "asc" } }),
  ]);
  return { settings, businessHours, testimonials };
}

export async function GET() {
  return withApi(async () => {
    await requireStaff();
    const existing = await prisma.businessSettings.findFirst();
    const id = existing?.id ?? DEFAULT_ID;
    const payload = await fetchSettingsPayload(id);
    const { telegramEnvChatId, telegramEffectiveChatId } = telegramChatPayload(payload.settings);
    return { data: { ...payload, settings: payload.settings ?? null, businessHours: payload.businessHours ?? [], testimonials: payload.testimonials ?? [], telegramEnvChatId, telegramEffectiveChatId } };
  });
}

export async function PATCH(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");

    const raw = await request.json().catch(() => null);
    const parsed = SettingsUpdateInput.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de configuración inválidos", 400);
    }

    const { businessHours, testimonials, ...scalars } = parsed.data;
    const cleanScalars = Object.fromEntries(Object.entries(scalars).filter(([, v]) => v !== undefined));

    const existing = await prisma.businessSettings.findFirst();
    const id = existing?.id ?? DEFAULT_ID;

    await prisma.$transaction(async (tx) => {
      await tx.businessSettings.upsert({
        where: { id },
        update: cleanScalars,
        create: { id, ...cleanScalars },
      });

      if (businessHours !== undefined) {
        await tx.businessHour.deleteMany({ where: { businessId: id } });
        const open = businessHours.filter((h) => h.openTime !== null && h.closeTime !== null);
        if (open.length) {
          await tx.businessHour.createMany({
            data: open.map((h) => ({ ...h, businessId: id, updatedAt: new Date() })),
          });
        }
      }

      if (testimonials !== undefined) {
        await tx.testimonial.deleteMany({ where: { businessId: id } });
        if (testimonials.length) {
          await tx.testimonial.createMany({
            data: testimonials.map((t) => ({ ...t, businessId: id, updatedAt: new Date() })),
          });
        }
      }
    });

    if (scalars.timezone) {
      resetBusinessTimezoneCache();
    }

    const payload = await fetchSettingsPayload(id);
    const { telegramEnvChatId, telegramEffectiveChatId } = telegramChatPayload(payload.settings);
    return { data: { ...payload, telegramEnvChatId, telegramEffectiveChatId } };
  });
}
