import { describe, it, expect, vi } from "vitest";
import {
  calculateAppointmentEnd,
  checkAppointmentConflict,
  createAppointment,
  hasOverlap,
  type AppointmentRepository,
} from "@/lib/services/appointment-service";
import { DomainError, ErrorCodes } from "@/lib/errors";

type Created = { id: string; endsAt: Date; priceCents: number };

function at(hour: number, minute: number): Date {
  return new Date(2026, 7, 20, hour, minute, 0);
}

function makeRepo(overrides: Partial<AppointmentRepository<Created>> = {}): AppointmentRepository<Created> {
  const repo: AppointmentRepository<Created> = {
    getService: vi.fn(async () => ({ id: "svc-1", durationMin: 45, priceCents: 2200 })),
    findBarberAppointments: vi.fn(async () => []),
    createAppointment: vi.fn(async (data) => ({ id: "apt-1", endsAt: data.endsAt, priceCents: data.priceCents })),
  };
  return { ...repo, ...overrides };
}

describe("calculateAppointmentEnd", () => {
  it("suma la duración en minutos al inicio", () => {
    expect(calculateAppointmentEnd(at(10, 0), 45)).toEqual(at(10, 45));
  });

  it("cruza el límite de la hora correctamente", () => {
    expect(calculateAppointmentEnd(at(11, 30), 35)).toEqual(at(12, 5));
  });

  it("respeta duraciones de un solo servicio", () => {
    expect(calculateAppointmentEnd(at(9, 0), 30)).toEqual(at(9, 30));
  });
});

describe("hasOverlap", () => {
  const existing = [{ startsAt: at(10, 0), endsAt: at(10, 45) }];

  it("detecta solapamiento cuando la nueva cita cae dentro", () => {
    expect(hasOverlap(existing, at(10, 30), at(11, 0))).toBe(true);
  });

  it("detecta solapamiento cuando la nueva cita cruza el inicio", () => {
    expect(hasOverlap(existing, at(9, 30), at(10, 15))).toBe(true);
  });

  it("detecta solapamiento con horario idéntico", () => {
    expect(hasOverlap(existing, at(10, 0), at(10, 45))).toBe(true);
  });

  it("no solapa cuando ocurre después", () => {
    expect(hasOverlap(existing, at(11, 0), at(11, 45))).toBe(false);
  });

  it("no solapa cuando ocurre antes", () => {
    expect(hasOverlap(existing, at(9, 0), at(9, 45))).toBe(false);
  });

  it("no solapa al tocar el fin de la existente", () => {
    expect(hasOverlap(existing, at(10, 45), at(11, 30))).toBe(false);
  });

  it("no solapa al tocar el inicio de la existente", () => {
    expect(hasOverlap(existing, at(9, 15), at(10, 0))).toBe(false);
  });

  it("no solapa con agenda vacía", () => {
    expect(hasOverlap([], at(10, 0), at(10, 45))).toBe(false);
  });
});

describe("checkAppointmentConflict", () => {
  it("lanza APPOINTMENT_CONFLICT cuando hay superposición", async () => {
    const repo = makeRepo({
      findBarberAppointments: vi.fn(async () => [{ id: "apt-x", startsAt: at(10, 0), endsAt: at(10, 45) }]),
    });
    await expect(checkAppointmentConflict(repo, "barber-1", at(10, 30), at(11, 0))).rejects.toMatchObject(
      new DomainError(ErrorCodes.APPOINTMENT_CONFLICT, "El barbero ya tiene una cita en ese horario", 409),
    );
  });

  it("resuelve cuando no hay superposición", async () => {
    const repo = makeRepo();
    await expect(checkAppointmentConflict(repo, "barber-1", at(11, 0), at(11, 45))).resolves.toBeUndefined();
  });
});

describe("createAppointment", () => {
  const input = { clientId: "client-1", barberId: "barber-1", serviceId: "svc-1", startsAt: at(10, 0), notes: null };

  it("deriva fin y precio desde el servicio", async () => {
    const repo = makeRepo();
    await createAppointment(repo, input);
    expect(repo.createAppointment).toHaveBeenCalledWith({
      clientId: "client-1",
      barberId: "barber-1",
      serviceId: "svc-1",
      startsAt: at(10, 0),
      endsAt: at(10, 45),
      priceCents: 2200,
      notes: null,
    });
  });

  it("lanza NOT_FOUND si el servicio no existe", async () => {
    const repo = makeRepo({ getService: vi.fn(async () => null) });
    await expect(createAppointment(repo, input)).rejects.toMatchObject(
      new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404),
    );
    expect(repo.createAppointment).not.toHaveBeenCalled();
  });

  it("lanza APPOINTMENT_CONFLICT si el barbero ya tiene cita", async () => {
    const repo = makeRepo({
      findBarberAppointments: vi.fn(async () => [{ id: "apt-x", startsAt: at(10, 0), endsAt: at(10, 45) }]),
    });
    await expect(createAppointment(repo, input)).rejects.toMatchObject(
      new DomainError(ErrorCodes.APPOINTMENT_CONFLICT, "El barbero ya tiene una cita en ese horario", 409),
    );
    expect(repo.createAppointment).not.toHaveBeenCalled();
  });

  it("propaga el resultado creado por el repositorio", async () => {
    const repo = makeRepo();
    const created = await createAppointment(repo, input);
    expect(created).toEqual({ id: "apt-1", endsAt: at(10, 45), priceCents: 2200 });
  });
});