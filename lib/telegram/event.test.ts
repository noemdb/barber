import { describe, it, expect } from "vitest";
import { toTelegramEvent, type AppointmentWithRelations } from "./event";

const appointment = {
  id: "clxabc123",
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
  endsAt: new Date("2026-09-01T15:30:00.000Z"),
  status: "PENDING",
  notes: null,
  priceCents: 1000,
  clientId: "clx-cli",
  barberId: "clx-bar",
  serviceId: "clx-svc",
  createdAt: new Date(),
  updatedAt: new Date(),
  client: {
    id: "clx-cli",
    name: "María",
    phone: null,
    email: null,
    notes: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  barber: {
    id: "clx-bar",
    name: "Luis",
    phone: null,
    email: null,
    specialty: null,
    active: true,
    avatar: null,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  service: {
    id: "clx-svc",
    name: "Corte",
    description: null,
    durationMin: 30,
    priceCents: 1000,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as AppointmentWithRelations;

describe("toTelegramEvent", () => {
  it("maps appointment relations to the notification event", () => {
    const event = toTelegramEvent(appointment);
    expect(event).toEqual({
      appointmentId: "clxabc123",
      clientName: "María",
      barberName: "Luis",
      serviceName: "Corte",
      startsAt: appointment.startsAt,
    });
  });
});
