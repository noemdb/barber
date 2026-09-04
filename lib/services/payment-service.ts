import { DomainError, ErrorCodes } from "@/lib/errors";
import type { Prisma, Appointment, Payment, PaymentMethod, PaymentStatus, AppointmentStatus } from "@/app/generated/prisma/client";

export interface AppointmentWithPayment extends Appointment {
  payment: Payment | null;
}

export interface PaymentRepository<T = unknown> {
  findAppointmentWithPayment(appointmentId: string): Promise<AppointmentWithPayment | null>;
  createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<T>;
  updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<Appointment>;
}

export interface CreatePaymentInput {
  appointmentId: string;
  amountCents?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  paidAt?: Date | null;
  notes?: string | null;
  completeAppointment?: boolean;
}

export interface CreatePaymentResult {
  payment: Payment;
  appointment: { id: string; status: AppointmentStatus };
}

export function validatePaymentAmount(amountCents: number, maxCents: number): void {
  if (amountCents > maxCents) {
    throw new DomainError(ErrorCodes.VALIDATION_ERROR, `El monto (${amountCents}) no puede exceder el precio de la cita (${maxCents})`, 400);
  }
}

export function validatePaidAt(status: PaymentStatus, paidAt: Date | null | undefined): void {
  if (status === "PAID" && !paidAt) {
    throw new DomainError(ErrorCodes.VALIDATION_ERROR, "paidAt es obligatorio cuando status es PAID", 400);
  }
  if (status === "PENDING" && paidAt) {
    throw new DomainError(ErrorCodes.VALIDATION_ERROR, "paidAt debe ser null cuando status es PENDING", 400);
  }
}

export function validateAppointmentForPayment(appointment: AppointmentWithPayment | null, completeAppointment: boolean): void {
  if (!appointment) {
    throw new DomainError(ErrorCodes.NOT_FOUND, "Cita no encontrada", 404);
  }
  if (appointment.payment) {
    throw new DomainError("APPOINTMENT_ALREADY_PAID", "La cita ya tiene un pago registrado", 409);
  }
  if (completeAppointment) {
    if (appointment.status === "CANCELLED") {
      throw new DomainError("INVALID_APPOINTMENT_STATUS", "No se puede completar una cita cancelada", 409);
    }
    if (appointment.status === "NO_SHOW") {
      throw new DomainError("INVALID_APPOINTMENT_STATUS", "No se puede completar una cita donde el cliente no asistió", 409);
    }
  }
}

export async function createPayment<T>(
  repo: PaymentRepository<T>,
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const {
    appointmentId,
    amountCents,
    method = "CASH",
    status = "PAID",
    paidAt,
    notes,
    completeAppointment = true,
  } = input;

  const appointment = await repo.findAppointmentWithPayment(appointmentId);
  validateAppointmentForPayment(appointment, completeAppointment);

  const finalAmountCents = amountCents ?? appointment!.priceCents;
  validatePaymentAmount(finalAmountCents, appointment!.priceCents);

  const finalPaidAt = status === "PAID" ? (paidAt ?? new Date()) : null;
  validatePaidAt(status, finalPaidAt);

  const payment = await repo.createPayment({
    appointmentId,
    amountCents: finalAmountCents,
    method,
    status,
    paidAt: finalPaidAt,
    notes,
  });

  if (completeAppointment) {
    await repo.updateAppointmentStatus(appointmentId, "COMPLETED");
  }

  const updatedAppointment = await repo.findAppointmentWithPayment(appointmentId);

  return {
    payment: payment as Payment,
    appointment: { id: updatedAppointment!.id, status: updatedAppointment!.status },
  };
}