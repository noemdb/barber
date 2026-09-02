import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTelegramChatId } from "./chat-id";
import { sendTelegramMessage } from "./notifier";
import { notifyAppointmentEvent } from "./notify-appointment";
import { getTelegramBusiness } from "./business";
import type { AppointmentEvent } from "./schemas";

vi.mock("./chat-id", () => ({ getTelegramChatId: vi.fn() }));
vi.mock("./notifier", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("./business", () => ({ getTelegramBusiness: vi.fn() }));
vi.mock("@/lib/time", () => ({ getBusinessTimezone: vi.fn(async () => "America/Caracas") }));

vi.mocked(getTelegramBusiness).mockResolvedValue({
  address: "Av. Bolívar, Local 5",
  mapsUrl: "https://maps.google.com/?q=Barber+Shop+Central",
  currency: "USD",
});

const event: AppointmentEvent = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  barberSpecialty: null,
  serviceName: "Corte",
  serviceDurationMin: 30,
  servicePriceCents: 1000,
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
};

describe("notifyAppointmentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits the send when no chat id is configured", async () => {
    vi.mocked(getTelegramChatId).mockResolvedValue(null);
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("sends the message to the configured chat", async () => {
    vi.mocked(getTelegramChatId).mockResolvedValue("-100123");
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true });
    await notifyAppointmentEvent("APPOINTMENT_CREATED", event);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      "-100123",
      expect.stringContaining("Nueva cita registrada")
    );
  });

  it("does not throw when Telegram fails", async () => {
    vi.mocked(getTelegramChatId).mockResolvedValue("-100123");
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: false, errorReason: "NETWORK" });
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
  });
});
