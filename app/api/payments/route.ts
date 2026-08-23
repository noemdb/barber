import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/permissions";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { paymentCreateSchema } from "@/lib/validations";
import { createPayment, type PaymentRepository } from "@/lib/services/payment-service";

type CreatedPayment = Awaited<ReturnType<typeof prisma.payment.create>>;

export async function POST(request: Request) {
  await requireStaff();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

  const parse = paymentCreateSchema.safeParse(raw);
  if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de pago inválidos", 400);

  const input = parse.data;

  const result = await prisma.$transaction(async (tx) => {
    const txRepo: PaymentRepository<CreatedPayment> = {
      findAppointmentWithPayment: (appointmentId) =>
        tx.appointment.findUnique({
          where: { id: appointmentId },
          include: { payment: true },
        }),
      createPayment: (data) =>
        tx.payment.create({
          data,
        }),
      updateAppointmentStatus: (appointmentId, status) =>
        tx.appointment.update({
          where: { id: appointmentId },
          data: { status },
        }),
    };

    return createPayment(txRepo, input);
  });

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}