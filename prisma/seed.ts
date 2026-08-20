import "dotenv/config";
import {
  PrismaClient,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "./seed-hash";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const ADMIN_EMAIL = "admin@barberservice.local";
const BARBER_EMAIL = "daniel@barberservice.local";
const ADMIN_PASSWORD = "Admin123!";
const BARBER_PASSWORD = "Barber123!";

const barberSeed = [
  { name: "Daniel García", phone: "+58 412 111 1111", email: BARBER_EMAIL, specialty: "Degradados" },
  { name: "Andrés López", phone: "+58 412 222 2222", email: "andres@barberservice.local", specialty: "Corte clásico" },
  { name: "Carlos Méndez", phone: "+58 412 333 3333", email: "carlos@barberservice.local", specialty: "Barba" },
];

const serviceSeed = [
  { name: "Corte + Barba", description: "Servicio completo", durationMin: 45, priceCents: 2200 },
  { name: "Degradado", description: "Fade personalizado", durationMin: 35, priceCents: 1800 },
  { name: "Corte clásico", description: "Corte tradicional", durationMin: 30, priceCents: 1500 },
  { name: "Barba", description: "Perfilado y arreglo de barba", durationMin: 20, priceCents: 1000 },
  { name: "Peinado", description: "Lavado, secado y styling", durationMin: 20, priceCents: 1200 },
];

const clientSeed = [
  { name: "Carlos Pérez", phone: "+58 412 400 0001", email: "carlos.perez@example.com" },
  { name: "Miguel Rodríguez", phone: "+58 412 400 0002", email: "miguel.rodriguez@example.com" },
  { name: "Luis García", phone: "+58 412 400 0003", email: null, notes: "Cliente frecuente, prefiere tardes" },
  { name: "Javier Torres", phone: "+58 412 400 0004", email: "javier.torres@example.com" },
  { name: "Pedro Sánchez", phone: "+58 412 400 0005", email: null },
  { name: "Alejandro Ruiz", phone: "+58 412 400 0006", email: "alejandro.ruiz@example.com" },
  { name: "Rafael Silva", phone: "+58 412 400 0007", email: null, notes: "Alergia a fragancias" },
  { name: "Gabriel Mora", phone: "+58 412 400 0008", email: "gabriel.mora@example.com" },
  { name: "Samuel Rivas", phone: "+58 412 400 0009", email: null },
  { name: "Diego Campos", phone: "+58 412 400 0010", email: "diego.campos@example.com", notes: "Prefiere a Daniel" },
];

type Slot = {
  hour: number;
  barber: number;
  service: number;
  client: number;
  status: AppointmentStatus;
  notes?: string;
};

// Plan por día relativo a hoy (offset en días). Sin solapamientos por barbero
// (duración máxima 45 min con separación ≥ 60 min entre horas del mismo barbero).
const plan: Record<number, Slot[]> = {
  [-6]: [
    { hour: 9, barber: 0, service: 0, client: 0, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 1, service: 1, client: 1, status: AppointmentStatus.COMPLETED },
  ],
  [-5]: [
    { hour: 9, barber: 2, service: 3, client: 2, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 0, service: 1, client: 3, status: AppointmentStatus.NO_SHOW, notes: "No se presentó. Intentar contactar." },
  ],
  [-4]: [
    { hour: 9, barber: 1, service: 2, client: 4, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 2, service: 0, client: 5, status: AppointmentStatus.COMPLETED },
    { hour: 11, barber: 0, service: 2, client: 6, status: AppointmentStatus.COMPLETED, notes: "Pago reembolsado por error en el cobro." },
  ],
  [-3]: [
    { hour: 9, barber: 0, service: 3, client: 7, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 1, service: 4, client: 8, status: AppointmentStatus.CANCELLED, notes: "Canceló por motivos personales." },
  ],
  [-2]: [
    { hour: 9, barber: 2, service: 1, client: 9, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 0, service: 4, client: 0, status: AppointmentStatus.COMPLETED, notes: "Pago pendiente de confirmar." },
  ],
  [-1]: [
    { hour: 9, barber: 1, service: 0, client: 1, status: AppointmentStatus.COMPLETED },
    { hour: 10, barber: 2, service: 2, client: 2, status: AppointmentStatus.CONFIRMED },
  ],
  [0]: [
    { hour: 8, barber: 0, service: 1, client: 3, status: AppointmentStatus.COMPLETED },
    { hour: 9, barber: 1, service: 0, client: 4, status: AppointmentStatus.CONFIRMED },
    { hour: 10, barber: 2, service: 3, client: 5, status: AppointmentStatus.PENDING, notes: "Confirmar por WhatsApp." },
    { hour: 14, barber: 0, service: 4, client: 6, status: AppointmentStatus.CONFIRMED },
  ],
  [1]: [
    { hour: 9, barber: 0, service: 2, client: 7, status: AppointmentStatus.PENDING },
    { hour: 10, barber: 1, service: 1, client: 8, status: AppointmentStatus.PENDING },
  ],
  [2]: [
    { hour: 9, barber: 2, service: 4, client: 9, status: AppointmentStatus.CONFIRMED },
    { hour: 10, barber: 0, service: 0, client: 1, status: AppointmentStatus.PENDING },
  ],
};

const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER, PaymentMethod.OTHER];

async function main() {
  await prisma.businessSettings.upsert({
    where: { id: "settings" },
    update: {
      businessName: "Barber Shop Central",
      phone: "+58 412 000 0000",
      email: "hola@barbershop.local",
      address: "Centro, San Felipe",
      currency: "USD",
      timezone: "America/Caracas",
      appointmentSlot: 30,
    },
    create: {
      id: "settings",
      businessName: "Barber Shop Central",
      phone: "+58 412 000 0000",
      email: "hola@barbershop.local",
      address: "Centro, San Felipe",
      currency: "USD",
      timezone: "America/Caracas",
      appointmentSlot: 30,
    },
  });

  const adminPasswordHash = await hash(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash, name: "Administrador", active: true, role: UserRole.OWNER },
    create: { name: "Administrador", email: ADMIN_EMAIL, passwordHash: adminPasswordHash, role: UserRole.OWNER },
  });

  const barberPasswordHash = await hash(BARBER_PASSWORD);
  const barberUser = await prisma.user.upsert({
    where: { email: BARBER_EMAIL },
    update: { passwordHash: barberPasswordHash, name: "Daniel García", active: true, role: UserRole.BARBER },
    create: { name: "Daniel García", email: BARBER_EMAIL, passwordHash: barberPasswordHash, role: UserRole.BARBER },
  });

  const barbers: { id: string; name: string }[] = [];
  for (const data of barberSeed) {
    const existing = await prisma.barber.findFirst({ where: { email: data.email } });
    if (existing) {
      if (data.email === BARBER_EMAIL && !existing.userId) {
        await prisma.barber.update({ where: { id: existing.id }, data: { userId: barberUser.id } });
      }
      barbers.push({ id: existing.id, name: existing.name });
    } else {
      const created = await prisma.barber.create({
        data: {
          ...data,
          userId: data.email === BARBER_EMAIL ? barberUser.id : null,
        },
      });
      barbers.push({ id: created.id, name: created.name });
    }
  }

  const services: { id: string; name: string; durationMin: number; priceCents: number }[] = [];
  for (const data of serviceSeed) {
    const existing = await prisma.service.findFirst({ where: { name: data.name } });
    if (existing) {
      services.push({ id: existing.id, name: existing.name, durationMin: existing.durationMin, priceCents: existing.priceCents });
    } else {
      const created = await prisma.service.create({ data });
      services.push({ id: created.id, name: created.name, durationMin: created.durationMin, priceCents: created.priceCents });
    }
  }

  const clients: { id: string; name: string }[] = [];
  for (const data of clientSeed) {
    const existing = await prisma.client.findFirst({ where: { name: data.name } });
    if (existing) {
      clients.push({ id: existing.id, name: existing.name });
    } else {
      const created = await prisma.client.create({ data });
      clients.push({ id: created.id, name: created.name });
    }
  }

  let createdAppointments = 0;
  let createdPayments = 0;

  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments > 0) {
    console.log(`Seed: ya existen ${existingAppointments} citas. Se omiten citas y pagos demo (idempotente).`);
  } else {
    let completedIndex = 0;
    for (const [offsetKey, slots] of Object.entries(plan)) {
      const offset = Number(offsetKey);
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + offset);
      for (const slot of slots) {
        const start = new Date(day);
        start.setHours(slot.hour, 0, 0, 0);
        const service = services[slot.service];
        const end = new Date(start.getTime() + service.durationMin * 60_000);
        const appointment = await prisma.appointment.create({
          data: {
            startsAt: start,
            endsAt: end,
            status: slot.status,
            notes: slot.notes ?? null,
            priceCents: service.priceCents,
            clientId: clients[slot.client].id,
            barberId: barbers[slot.barber].id,
            serviceId: service.id,
          },
        });
        createdAppointments += 1;

        if (slot.status === AppointmentStatus.COMPLETED) {
          let status: PaymentStatus = PaymentStatus.PAID;
          let paidAt: Date | null = start;
          if (offset === -4 && slot.hour === 11) status = PaymentStatus.REFUNDED;
          if (offset === -2 && slot.hour === 10) {
            status = PaymentStatus.PENDING;
            paidAt = null;
          }
          await prisma.payment.create({
            data: {
              appointmentId: appointment.id,
              amountCents: service.priceCents,
              method: paymentMethods[completedIndex % paymentMethods.length],
              status,
              paidAt,
            },
          });
          createdPayments += 1;
          completedIndex += 1;
        }
      }
    }
  }

  const [users, allBarbers, allServices, allClients, allAppointments, allPayments] = await Promise.all([
    prisma.user.count(),
    prisma.barber.count(),
    prisma.service.count(),
    prisma.client.count(),
    prisma.appointment.count(),
    prisma.payment.count(),
  ]);

  console.log("Seed completo:");
  console.log(`  Negocio: Barber Shop Central (${await prisma.businessSettings.count()} registro)`);
  console.log(`  Usuarios: ${users} (admin: ${ADMIN_EMAIL}/${ADMIN_PASSWORD}; barbero: ${BARBER_EMAIL}/${BARBER_PASSWORD})`);
  console.log(`  Barberos: ${allBarbers}`);
  console.log(`  Servicios: ${allServices}`);
  console.log(`  Clientes: ${allClients}`);
  console.log(`  Citas: ${allAppointments} (creadas ahora: ${createdAppointments})`);
  console.log(`  Pagos: ${allPayments} (creados ahora: ${createdPayments})`);
  void admin;
}

main()
  .catch((error) => {
    console.error("Seed falló:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());