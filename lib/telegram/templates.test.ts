import { describe, it, expect } from "vitest";
import { buildNotificationText, type NotificationBusiness } from "./templates";
import type { AppointmentEvent, NotificationType } from "./schemas";

const event: AppointmentEvent = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  barberSpecialty: "Barbero especialista en barba",
  serviceName: "Corte",
  serviceDurationMin: 30,
  servicePriceCents: 1000,
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
};

const business: NotificationBusiness = {
  address: "Av. Bolívar, Local 5",
  mapsUrl: "https://maps.google.com/?q=Barber+Shop+Central",
  currency: "USD",
};

function text(type: NotificationType, b = business) {
  return buildNotificationText(type, event, { timeZone: "America/Caracas", business: b });
}

describe("buildNotificationText", () => {
  it("creates a message with client, service, barber, price, date and location", () => {
    const out = text("APPOINTMENT_CREATED");
    expect(out).toContain("Nueva cita registrada");
    expect(out).toContain("María");
    expect(out).toContain("Luis (Barbero especialista en barba)");
    expect(out).toContain("Corte · 30 min");
    expect(out).toContain("10,00");
    expect(out).toContain("Av. Bolívar, Local 5");
    expect(out).toContain("Ver en Google Maps");
    expect(out).toContain(business.mapsUrl);
  });

  it("omits location and maps lines when business data is missing", () => {
    const out = text("APPOINTMENT_CREATED", {});
    expect(out).toContain("Nueva cita registrada");
    expect(out).toContain("María");
    expect(out).toContain("Corte · 30 min");
    expect(out).not.toContain("Ubicación");
    expect(out).not.toContain("Ver en Google Maps");
  });

  it("renders barber without specialty when it is null", () => {
    const out = buildNotificationText("APPOINTMENT_CREATED", { ...event, barberSpecialty: null }, { timeZone: "America/Caracas", business });
    expect(out).toContain("Barbero: Luis\n");
    expect(out).not.toContain("Luis (");
  });

  it("confirmation message differs from creation", () => {
    expect(text("APPOINTMENT_CONFIRMED")).not.toBe(text("APPOINTMENT_CREATED"));
  });

  it("completed message says the service was completed", () => {
    expect(text("APPOINTMENT_COMPLETED")).toContain("Servicio completado");
  });
});
