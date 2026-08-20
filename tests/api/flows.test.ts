import { afterAll, describe, expect, it } from "vitest";
import { ApiClient, prisma } from "./helpers";

const adminEmail = "admin@barberservice.local";
const adminPassword = "Admin123!";

const created = { appointmentIds: [] as string[], clientEmails: [] as string[], userEmails: [] as string[] };

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("Autenticación y permisos", () => {
  const email = `cliente.${Date.now()}@ejemplo.com`;

  it("registra un cliente con rol CLIENT", async () => {
    const res = await new ApiClient().post("/api/auth/register", {
      name: "Cliente Test",
      email,
      password: "Clave123!",
    });
    expect(res.status).toBe(200);
    expect(res.json?.success).toBe(true);
    expect(res.json?.data as { role: string }).toHaveProperty("role", "CLIENT");
    created.userEmails.push(email);
    created.clientEmails.push(email);
  });

  it("rechaza un correo duplicado con 409", async () => {
    const res = await new ApiClient().post("/api/auth/register", {
      name: "Otro",
      email,
      password: "Clave123!",
    });
    expect(res.status).toBe(409);
    expect(res.json?.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza contraseña corta con 400", async () => {
    const res = await new ApiClient().post("/api/auth/register", {
      name: "Corto",
      email: `corto.${Date.now()}@ejemplo.com`,
      password: "123",
    });
    expect(res.status).toBe(400);
    expect(res.json?.error?.code).toBe("VALIDATION_ERROR");
  });

  it("loguea al staff (OWNER) desde el seed", async () => {
    const res = await new ApiClient().post("/api/auth/login", { email: adminEmail, password: adminPassword });
    expect(res.status).toBe(200);
    expect((res.json?.data as { role: string }).role).toBe("OWNER");
  });

  it("rechaza credenciales inválidas con 401", async () => {
    const res = await new ApiClient().post("/api/auth/login", { email: adminEmail, password: "incorrecta" });
    expect(res.status).toBe(401);
    expect(res.json?.error?.code).toBe("UNAUTHORIZED");
  });

  it("bloquea el acceso sin sesión con 401", async () => {
    const res = await new ApiClient().get("/api/appointments");
    expect(res.status).toBe(401);
  });

  it("bloquea al CLIENT en endpoints de staff con 403", async () => {
    const clientApi = new ApiClient();
    await clientApi.post("/api/auth/login", { email, password: "Clave123!" });
    const res = await clientApi.get("/api/appointments");
    expect(res.status).toBe(403);
    expect(res.json?.error?.code).toBe("FORBIDDEN");
  });
});

describe("Reserva pública y gestión de citas", () => {
  const api = new ApiClient();
  const guestEmail = `invitado.${Date.now()}@ejemplo.com`;
  let serviceId = "";
  let barberId = "";
  let startsAt = "";

  afterAll(async () => {
    if (created.appointmentIds.length) {
      await prisma.appointment.deleteMany({ where: { id: { in: created.appointmentIds } } });
    }
    if (created.clientEmails.length) {
      await prisma.client.deleteMany({ where: { email: { in: created.clientEmails } } });
    }
    if (created.userEmails.length) {
      await prisma.user.deleteMany({ where: { email: { in: created.userEmails } } });
    }
  });

  it("prepara staff y catálogo (login + servicios + barberos)", async () => {
    const login = await api.post("/api/auth/login", { email: adminEmail, password: adminPassword });
    expect(login.status).toBe(200);

    const svc = await api.get("/api/services");
    expect(svc.status).toBe(200);
    serviceId = (svc.json?.data as Array<{ id: string }>)[0]?.id ?? "";
    expect(serviceId).toBeTruthy();

    const barb = await api.get("/api/barbers");
    expect(barb.status).toBe(200);
    barberId = (barb.json?.data as Array<{ id: string }>)[0]?.id ?? "";
    expect(barberId).toBeTruthy();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(6, 0, 0, 0);
    startsAt = tomorrow.toISOString();
  });

  it("crea una reserva como invitado", async () => {
    const res = await api.post("/api/booking", {
      name: "Invitado Test",
      email: guestEmail,
      serviceId,
      barberId,
      startsAt,
    });
    expect(res.status).toBe(201);
    expect(res.json?.success).toBe(true);
    expect((res.json?.data as { status: string }).status).toBe("PENDING");
    created.appointmentIds.push((res.json?.data as { id: string }).id);
    created.clientEmails.push(guestEmail);
  });

  it("rechaza reserva con horario pasado con 400", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await api.post("/api/booking", {
      name: "Pasado",
      email: `pasado.${Date.now()}@ejemplo.com`,
      serviceId,
      barberId,
      startsAt: past,
    });
    expect(res.status).toBe(400);
    expect(res.json?.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza reserva con datos incompletos con 400", async () => {
    const res = await api.post("/api/booking", { name: "", email: "no-valid", startsAt });
    expect(res.status).toBe(400);
    expect(res.json?.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza doble reserva del mismo barbero/hora con 409", async () => {
    const res = await api.post("/api/booking", {
      name: "Invitado Test",
      email: guestEmail,
      serviceId,
      barberId,
      startsAt,
    });
    expect(res.status).toBe(409);
    expect(res.json?.error?.code).toBe("APPOINTMENT_CONFLICT");
  });

  it("incluye la reserva en el listado staff del día", async () => {
    const day = localDay(startsAt);
    const res = await api.get(`/api/appointments?from=${day}&to=${day}`);
    expect(res.status).toBe(200);
    const ids = ((res.json?.data as { appointments: Array<{ id: string }> }).appointments).map((a) => a.id);
    expect(ids).toContain(created.appointmentIds[0]);
  });

  it("confirma y completa la cita", async () => {
    const id = created.appointmentIds[0];

    const confirm = await api.patch(`/api/appointments/${id}`, { status: "CONFIRMED" });
    expect(confirm.status).toBe(200);
    expect((confirm.json?.data as { status: string }).status).toBe("CONFIRMED");

    const complete = await api.patch(`/api/appointments/${id}`, { status: "COMPLETED" });
    expect(complete.status).toBe(200);
    expect((complete.json?.data as { status: string }).status).toBe("COMPLETED");
  });

  it("bloquea el PATCH de estado a un BARBER con 403", async () => {
    const barberApi = new ApiClient();
    const login = await barberApi.post("/api/auth/login", {
      email: "daniel@barberservice.local",
      password: "Barber123!",
    });
    expect(login.status).toBe(200);
    const res = await barberApi.patch(`/api/appointments/${created.appointmentIds[0]}`, { status: "CONFIRMED" });
    expect(res.status).toBe(403);
    expect(res.json?.error?.code).toBe("FORBIDDEN");
  });

  it("devuelve 404 para una cita inexistente", async () => {
    const res = await api.get("/api/appointments/id-que-no-existe");
    expect(res.status).toBe(404);
    expect(res.json?.error?.code).toBe("NOT_FOUND");
  });
});