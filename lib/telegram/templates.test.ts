import { describe, it, expect } from "vitest";
import { buildNotificationText } from "./templates";
import type { AppointmentEvent, NotificationType } from "./schemas";

const event: AppointmentEvent = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  serviceName: "Corte",
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
};

function text(type: NotificationType) {
  return buildNotificationText(type, event, { timeZone: "America/Caracas" });
}

describe("buildNotificationText", () => {
  it("creates a message with client, service, barber and date", () => {
    const out = text("APPOINTMENT_CREATED");
    expect(out).toContain("Nueva cita registrada");
    expect(out).toContain("María");
    expect(out).toContain("Corte");
    expect(out).toContain("Luis");
  });
  it("confirmation message differs from creation", () => {
    expect(text("APPOINTMENT_CONFIRMED")).not.toBe(text("APPOINTMENT_CREATED"));
  });
  it("completed message says the service was completed", () => {
    expect(text("APPOINTMENT_COMPLETED")).toContain("Servicio completado");
  });
});
