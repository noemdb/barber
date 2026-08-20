import { DomainError, ErrorCodes } from "@/lib/errors";

export interface AppointmentRepository<T = unknown> {
  getService(serviceId: string): Promise<{ id: string; durationMin: number; priceCents: number } | null>;
  findBarberAppointments(
    barberId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ id: string; startsAt: Date; endsAt: Date }>>;
  createAppointment(data: CreateAppointmentData): Promise<T>;
}

export interface CreateAppointmentData {
  clientId: string;
  barberId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  notes: string | null;
}

export interface CreateAppointmentInput {
  clientId: string;
  barberId: string;
  serviceId: string;
  startsAt: Date;
  notes: string | null;
}

export function calculateAppointmentEnd(start: Date, durationMin: number): Date {
  return new Date(start.getTime() + durationMin * 60_000);
}

export function hasOverlap(
  existing: ReadonlyArray<{ startsAt: Date; endsAt: Date }>,
  start: Date,
  end: Date,
): boolean {
  return existing.some((appointment) => start < appointment.endsAt && end > appointment.startsAt);
}

export async function checkAppointmentConflict(
  repo: AppointmentRepository,
  barberId: string,
  start: Date,
  end: Date,
): Promise<void> {
  const existing = await repo.findBarberAppointments(barberId, start, end);
  if (hasOverlap(existing, start, end)) {
    throw new DomainError(ErrorCodes.APPOINTMENT_CONFLICT, "El barbero ya tiene una cita en ese horario", 409);
  }
}

export async function createAppointment<T>(
  repo: AppointmentRepository<T>,
  input: CreateAppointmentInput,
): Promise<T> {
  const service = await repo.getService(input.serviceId);
  if (!service) throw new DomainError(ErrorCodes.NOT_FOUND, "Servicio no encontrado", 404);
  const endsAt = calculateAppointmentEnd(input.startsAt, service.durationMin);
  await checkAppointmentConflict(repo, input.barberId, input.startsAt, endsAt);
  return repo.createAppointment({
    clientId: input.clientId,
    barberId: input.barberId,
    serviceId: input.serviceId,
    startsAt: input.startsAt,
    endsAt,
    priceCents: service.priceCents,
    notes: input.notes,
  });
}