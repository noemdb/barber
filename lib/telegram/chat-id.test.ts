import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getTelegramChatId } from "./chat-id";

vi.mock("@/lib/prisma", () => ({
  prisma: { businessSettings: { findFirst: vi.fn() } },
}));

describe("getTelegramChatId", () => {
  const findFirst = vi.mocked(prisma.businessSettings.findFirst);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the value stored in BusinessSettings", async () => {
    findFirst.mockResolvedValue({ telegramChatId: "-100settings" } as never);
    await expect(getTelegramChatId()).resolves.toBe("-100settings");
  });

  it("falls back to TELEGRAM_CHAT_ID env when settings are empty", async () => {
    findFirst.mockResolvedValue({ telegramChatId: null } as never);
    process.env.TELEGRAM_CHAT_ID = "-100env";
    await expect(getTelegramChatId()).resolves.toBe("-100env");
  });

  it("returns null when neither is set", async () => {
    findFirst.mockResolvedValue({ telegramChatId: null } as never);
    delete process.env.TELEGRAM_CHAT_ID;
    await expect(getTelegramChatId()).resolves.toBeNull();
  });
});
