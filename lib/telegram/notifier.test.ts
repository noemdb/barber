import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTelegramMessage } from "./notifier";

describe("sendTelegramMessage", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("returns UNKNOWN when TELEGRAM_BOT_TOKEN is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({
      ok: false,
      errorReason: "UNKNOWN",
    });
  });

  it("returns ok on success", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: true });
  });

  it("maps 403 to BOT_BLOCKED", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 403 })));
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({
      ok: false,
      errorCode: 403,
      errorReason: "BOT_BLOCKED",
    });
  });

  it("maps 400 chat not found to CHAT_NOT_FOUND", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, description: "Bad Request: chat not found" }), { status: 400 })
      )
    );
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({
      ok: false,
      errorCode: 400,
      errorReason: "CHAT_NOT_FOUND",
    });
  });

  it("maps network errors to NETWORK", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({
      ok: false,
      errorReason: "NETWORK",
    });
  });
});
