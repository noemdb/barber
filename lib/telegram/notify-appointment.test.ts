import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTelegramMessage } from "./notifier";
import { notifyAppointmentEvent } from "./notify-appointment";
import type { AppointmentEvent } from "./schemas";

vi.mock("./notifier", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("@/lib/time", () => ({ getBusinessTimezone: vi.fn(async () => "America/Caracas") }));

const event: AppointmentEvent = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  serviceName: "Corte",
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
};

describe("notifyAppointmentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits the send when TELEGRAM_CHAT_ID is not set", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("sends the message to the configured chat", async () => {
    process.env.TELEGRAM_CHAT_ID = "-100123";
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true });
    await notifyAppointmentEvent("APPOINTMENT_CREATED", event);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      "-100123",
      expect.stringContaining("Nueva cita registrada")
    );
  });

  it("does not throw when Telegram fails", async () => {
    process.env.TELEGRAM_CHAT_ID = "-100123";
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: false, errorReason: "NETWORK" });
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
  });
});
