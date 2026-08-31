import { describe, it, expect } from "vitest";
import { AppointmentEventSchema, NotificationTypeSchema } from "./schemas";

const base = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  serviceName: "Corte",
  startsAt: "2026-09-01T15:00:00.000Z",
};

describe("AppointmentEventSchema", () => {
  it("parses a valid appointment event", () => {
    const parsed = AppointmentEventSchema.parse(base);
    expect(parsed.clientName).toBe("María");
    expect(parsed.startsAt).toBeInstanceOf(Date);
  });
  it("rejects an invalid appointment id", () => {
    expect(() => AppointmentEventSchema.parse({ ...base, appointmentId: "nope" })).toThrow();
  });
});

describe("NotificationTypeSchema", () => {
  it("parses known types", () => {
    expect(NotificationTypeSchema.parse("APPOINTMENT_CONFIRMED")).toBe("APPOINTMENT_CONFIRMED");
  });
  it("rejects unknown types", () => {
    expect(() => NotificationTypeSchema.parse("APPOINTMENT_DELETED")).toThrow();
  });
});
