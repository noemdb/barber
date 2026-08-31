# Notificaciones por Telegram (chat único staff) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar notificaciones a un chat único de Telegram (grupo de staff) cuando se crea, confirma o completa una cita, sin que un fallo de Telegram afecte nunca el flujo de negocio.

**Architecture:** Un servicio puro y testeable (`lib/telegram/*`) que arma el mensaje a partir de las relaciones de `Appointment` (`client`/`barber`/`service`), lo envía a `sendMessage` de la API de Telegram y se dispara de forma *fire-and-forget* con `after()` de `next/server` desde dos puntos de integración reales: el `POST /api/appointments` (crear) y el `PATCH /api/appointments/[id]` (confirmar/completar). Configuración por variables de entorno (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) — Opción A del spec.

**Tech Stack:** Next.js 16.3.1 (App Router), Prisma 7 + Neon, Zod 4.4.3, Vitest, `after()` de `next/server`.

## Global Constraints

- **No usar `import "server-only"`** — el paquete no está instalado; rompería el build.
- **No crear rutas `confirm`/`complete`** — confirmar/completar es un cambio de `status` vía `PATCH [id]`.
- Usar **`after()`** de `next/server` para fire-and-forget (despliegue Vercel, serverless) — verificado: `export { after } from 'next/dist/server/after'`.
- RBAC con lo existente: `requireRole("ADMIN","OWNER")`, `requireStaff()`, `withApi`, `DomainError`.
- Zod 4: `z.string().cuid("...")` y `z.coerce.date()` ya en uso en el repo.
- Solo una fuente de verdad del `chat_id`: `process.env.TELEGRAM_CHAT_ID` (Opción A). `TELEGRAM_*` nunca hardcodeado; documentado en `.env.example`.
- Un fallo de Telegram **nunca** lanza ni bloquea la operación de negocio.
- Zona horaria del negocio: `getBusinessTimezone()` de `lib/time.ts` (default `America/Caracas`).

## File Structure

**Created**
- `lib/telegram/schemas.ts` — zod `AppointmentEventSchema`, `NotificationTypeSchema` + tipos `AppointmentEvent`, `NotificationType`.
- `lib/telegram/notifier.ts` — `sendTelegramMessage(chatId, text): Promise<SendResult>`.
- `lib/telegram/templates.ts` — `buildNotificationText(type, event, opts?): string`.
- `lib/telegram/event.ts` — `AppointmentWithRelations` + `toTelegramEvent(appointment)`.
- `lib/telegram/notify-appointment.ts` — `notifyAppointmentEvent(type, event): Promise<void>`.
- Tests colocated: `lib/telegram/schemas.test.ts`, `notifier.test.ts`, `templates.test.ts`, `event.test.ts`, `notify-appointment.test.ts`.

**Modified**
- `app/api/appointments/route.ts` — `POST`: disparar `APPOINTMENT_CREATED` en `after()`.
- `app/api/appointments/[id]/route.ts` — `PATCH`: disparar `CONFIRMED`/`COMPLETED` en `after()` solo en transición real de estado.

**Interfaces** (signatures that later tasks depend on)
- `sendTelegramMessage(chatId: string, text: string): Promise<{ ok: boolean; errorCode?: number; errorReason?: "BOT_BLOCKED" | "CHAT_NOT_FOUND" | "NETWORK" | "UNKNOWN" }>`
- `buildNotificationText(type: NotificationType, event: AppointmentEvent, opts?: { timeZone?: string }): string`
- `toTelegramEvent(appointment: AppointmentWithRelations): AppointmentEvent`
- `notifyAppointmentEvent(rawType: NotificationType, rawEvent: AppointmentEvent): Promise<void>`
- `AppointmentEvent = { appointmentId; clientName; barberName; serviceName; startsAt }`
- `NotificationType = "APPOINTMENT_CREATED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_COMPLETED"`
- `AppointmentWithRelations = Appointment & { client: Client; barber: Barber; service: Service }`

---

### Task 1: `lib/telegram/schemas.ts`

**Files:**
- Create: `lib/telegram/schemas.ts`
- Test: `lib/telegram/schemas.test.ts`

**Interfaces:**
- Produces: `AppointmentEventSchema`, `NotificationTypeSchema`, `type AppointmentEvent`, `type NotificationType`.

#### Step 1: Write the failing test

```ts
// lib/telegram/schemas.test.ts
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
```

#### Step 2: Run the test to verify it fails

Run: `npx vitest run lib/telegram/schemas.test.ts`
Expected: FAIL (cannot resolve `./schemas`).

#### Step 3: Write the implementation

```ts
// lib/telegram/schemas.ts
import { z } from "zod";

export const AppointmentEventSchema = z.object({
  appointmentId: z.string().cuid("ID de cita inválido"),
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  barberName: z.string().min(1, "El nombre del barbero es obligatorio"),
  serviceName: z.string().min(1, "El nombre del servicio es obligatorio"),
  startsAt: z.coerce.date(),
});
export type AppointmentEvent = z.infer<typeof AppointmentEventSchema>;

export const NotificationTypeSchema = z.enum([
  "APPOINTMENT_CREATED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_COMPLETED",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
```

#### Step 4: Run the test to verify it passes

Run: `npx vitest run lib/telegram/schemas.test.ts`
Expected: PASS.

#### Step 5: Commit

```bash
git add lib/telegram/schemas.ts lib/telegram/schemas.test.ts
git commit -m "feat(telegram): add appointment event and notification type schemas"
```

---

### Task 2: `lib/telegram/templates.ts`

**Files:**
- Create: `lib/telegram/templates.ts`
- Test: `lib/telegram/templates.test.ts`

**Interfaces:**
- Consumes: `type AppointmentEvent`, `type NotificationType` from `./schemas`.
- Produces: `buildNotificationText(type, event, opts?): string`.

#### Step 1: Write the failing test

```ts
// lib/telegram/templates.test.ts
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
  it("completed message thanks the client", () => {
    expect(text("APPOINTMENT_COMPLETED")).toContain("Servicio completado");
  });
});
```

#### Step 2: Run the test to verify it fails

Run: `npx vitest run lib/telegram/templates.test.ts`
Expected: FAIL (cannot resolve `./templates`).

#### Step 3: Write the implementation

```ts
// lib/telegram/templates.ts
import type { AppointmentEvent, NotificationType } from "./schemas";

function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildNotificationText(
  type: NotificationType,
  event: AppointmentEvent,
  options?: { timeZone?: string }
): string {
  const tz = options?.timeZone ?? "America/Caracas";
  const when = formatDateTime(event.startsAt, tz);

  switch (type) {
    case "APPOINTMENT_CREATED":
      return (
        `🆕 <b>Nueva cita registrada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.serviceName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_CONFIRMED":
      return (
        `✅ <b>Cita confirmada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.serviceName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_COMPLETED":
      return (
        `✂️ <b>Servicio completado</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Barbero: ${event.barberName}\n` +
        `Servicio: ${event.serviceName}`
      );
  }
}
```

#### Step 4: Run the test to verify it passes

Run: `npx vitest run lib/telegram/templates.test.ts`
Expected: PASS.

#### Step 5: Commit

```bash
git add lib/telegram/templates.ts lib/telegram/templates.test.ts
git commit -m "feat(telegram): add notification message templates"
```

---

### Task 3: `lib/telegram/notifier.ts`

**Files:**
- Create: `lib/telegram/notifier.ts`
- Test: `lib/telegram/notifier.test.ts`

**Interfaces:**
- Produces: `sendTelegramMessage(chatId, text): Promise<SendResult>`, `type SendResult`.

#### Step 1: Write the failing test

```ts
// lib/telegram/notifier.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTelegramMessage } from "./notifier";

describe("sendTelegramMessage", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns UNKNOWN when TELEGRAM_BOT_TOKEN is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: false, errorReason: "UNKNOWN" });
  });

  it("returns ok on success", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: true });
  });

  it("maps 403 to BOT_BLOCKED", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 403 }));
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: false, errorCode: 403, errorReason: "BOT_BLOCKED" });
  });

  it("maps 400 chat not found to CHAT_NOT_FOUND", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, description: "Bad Request: chat not found" }), { status: 400 })
    );
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: false, errorCode: 400, errorReason: "CHAT_NOT_FOUND" });
  });

  it("maps network errors to NETWORK", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    global.fetch = vi.fn(async () => { throw new Error("boom"); });
    await expect(sendTelegramMessage("123", "hi")).resolves.toEqual({ ok: false, errorReason: "NETWORK" });
  });
});
```

#### Step 2: Run the test to verify it fails

Run: `npx vitest run lib/telegram/notifier.test.ts`
Expected: FAIL (cannot resolve `./notifier`).

#### Step 3: Write the implementation

```ts
// lib/telegram/notifier.ts
const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface SendResult {
  ok: boolean;
  errorCode?: number;
  errorReason?: "BOT_BLOCKED" | "CHAT_NOT_FOUND" | "NETWORK" | "UNKNOWN";
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN no configurado");
    return { ok: false, errorReason: "UNKNOWN" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) return { ok: true };

    const body = await response.json().catch(() => null);
    const description: string = body?.description ?? "";

    if (response.status === 403) {
      return { ok: false, errorCode: 403, errorReason: "BOT_BLOCKED" };
    }
    if (response.status === 400 && description.includes("chat not found")) {
      return { ok: false, errorCode: 400, errorReason: "CHAT_NOT_FOUND" };
    }

    console.error(`[telegram] error ${response.status}: ${description}`);
    return { ok: false, errorCode: response.status, errorReason: "UNKNOWN" };
  } catch (err) {
    console.error("[telegram] fallo de red", err);
    return { ok: false, errorReason: "NETWORK" };
  }
}
```

#### Step 4: Run the test to verify it passes

Run: `npx vitest run lib/telegram/notifier.test.ts`
Expected: PASS.

#### Step 5: Commit

```bash
git add lib/telegram/notifier.ts lib/telegram/notifier.test.ts
git commit -m "feat(telegram): add sendTelegramMessage client"
```

---

### Task 4: `lib/telegram/event.ts`

**Files:**
- Create: `lib/telegram/event.ts`
- Test: `lib/telegram/event.test.ts`

**Interfaces:**
- Consumes: `type AppointmentEvent` from `./schemas`; Prisma model types `Appointment`, `Client`, `Barber`, `Service`.
- Produces: `toTelegramEvent(appointment): AppointmentEvent`, `type AppointmentWithRelations`.

#### Step 1: Write the failing test

```ts
// lib/telegram/event.test.ts
import { describe, it, expect } from "vitest";
import { toTelegramEvent, type AppointmentWithRelations } from "./event";

const appointment: AppointmentWithRelations = {
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
  client: { id: "clx-cli", name: "María", phone: null, email: null, notes: null, active: true, createdAt: new Date(), updatedAt: new Date() },
  barber: { id: "clx-bar", name: "Luis", phone: null, email: null, specialty: null, active: true, avatar: null, userId: null, createdAt: new Date(), updatedAt: new Date() },
  service: { id: "clx-svc", name: "Corte", description: null, durationMin: 30, priceCents: 1000, active: true, createdAt: new Date(), updatedAt: new Date() },
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
```

> Nota: los objetos de relación se tipan con `as AppointmentWithRelations` porque el cast evita rellenar todos los campos opcionales de Prisma en el fixture. El test verifica el mapeo, no el esquema de Prisma.

#### Step 2: Run the test to verify it fails

Run: `npx vitest run lib/telegram/event.test.ts`
Expected: FAIL (cannot resolve `./event`).

#### Step 3: Write the implementation

```ts
// lib/telegram/event.ts
import type { Appointment, Barber, Client, Service } from "@/app/generated/prisma/client";
import type { AppointmentEvent } from "./schemas";

export type AppointmentWithRelations = Appointment & {
  client: Client;
  barber: Barber;
  service: Service;
};

export function toTelegramEvent(appointment: AppointmentWithRelations): AppointmentEvent {
  return {
    appointmentId: appointment.id,
    clientName: appointment.client.name,
    barberName: appointment.barber.name,
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt,
  };
}
```

#### Step 4: Run the test to verify it passes

Run: `npx vitest run lib/telegram/event.test.ts`
Expected: PASS.

#### Step 5: Commit

```bash
git add lib/telegram/event.ts lib/telegram/event.test.ts
git commit -m "feat(telegram): add appointment to event mapper"
```

---

### Task 5: `lib/telegram/notify-appointment.ts`

**Files:**
- Create: `lib/telegram/notify-appointment.ts`
- Test: `lib/telegram/notify-appointment.test.ts`

**Interfaces:**
- Consumes: `sendTelegramMessage` from `./notifier`, `buildNotificationText` from `./templates`, `getBusinessTimezone` from `@/lib/time`, `AppointmentEventSchema`/`NotificationTypeSchema` from `./schemas`.
- Produces: `notifyAppointmentEvent(type, event): Promise<void>`.

#### Step 1: Write the failing test

```ts
// lib/telegram/notify-appointment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTelegramMessage } from "./notifier";
import { notifyAppointmentEvent } from "./notify-appointment";
import type { AppointmentEvent } from "./schemas";

vi.mock("./notifier", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("@/lib/time", () => ({ getBusinessTimezone: vi.fn(async () => "America/Caracas") }));

const event: AppointmentEvent = {
  appointmentId: "clxabc123",
  clientName: "María",
  barberName: "Luis",
  serviceName: "Corte",
  startsAt: new Date("2026-09-01T15:00:00.000Z"),
};

describe("notifyAppointmentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits the send when TELEGRAM_CHAT_ID is not set", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("sends the message to the configured chat", async () => {
    process.env.TELEGRAM_CHAT_ID = "-100123";
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true });
    await notifyAppointmentEvent("APPOINTMENT_CREATED", event);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      "-100123",
      expect.stringContaining("Nueva cita registrada")
    );
  });

  it("does not throw when Telegram fails", async () => {
    process.env.TELEGRAM_CHAT_ID = "-100123";
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: false, errorReason: "NETWORK" });
    await expect(notifyAppointmentEvent("APPOINTMENT_CREATED", event)).resolves.toBeUndefined();
  });
});
```

#### Step 2: Run the test to verify it fails

Run: `npx vitest run lib/telegram/notify-appointment.test.ts`
Expected: FAIL (cannot resolve `./notify-appointment`).

#### Step 3: Write the implementation

```ts
// lib/telegram/notify-appointment.ts
import { getBusinessTimezone } from "@/lib/time";
import { sendTelegramMessage } from "./notifier";
import { buildNotificationText } from "./templates";
import {
  AppointmentEventSchema,
  NotificationTypeSchema,
  type AppointmentEvent,
  type NotificationType,
} from "./schemas";

export async function notifyAppointmentEvent(
  rawType: NotificationType,
  rawEvent: AppointmentEvent
): Promise<void> {
  const type = NotificationTypeSchema.parse(rawType);
  const event = AppointmentEventSchema.parse(rawEvent);

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error("[telegram] TELEGRAM_CHAT_ID no configurado, se omite notificación");
    return;
  }

  const timeZone = await getBusinessTimezone();
  const text = buildNotificationText(type, event, { timeZone });
  const result = await sendTelegramMessage(chatId, text);

  if (!result.ok) {
    console.error(
      `[telegram] no se pudo enviar notificación ${type} (cita ${event.appointmentId}): ${result.errorReason}`
    );
  }
}
```

#### Step 4: Run the test to verify it passes

Run: `npx vitest run lib/telegram/notify-appointment.test.ts`
Expected: PASS.

#### Step 5: Commit

```bash
git add lib/telegram/notify-appointment.ts lib/telegram/notify-appointment.test.ts
git commit -m "feat(telegram): add notifyAppointmentEvent orchestrator"
```

---

### Task 6: Wire `POST /api/appointments` (crear cita)

**Files:**
- Modify: `app/api/appointments/route.ts`
- Test: `npm run typecheck` (los handlers no tienen test de rutas en el repo; la lógica de notificación ya está cubierta por Task 5).

**Interfaces:**
- Uses `notifyAppointmentEvent` from `@/lib/telegram/notify-appointment`, `toTelegramEvent` from `@/lib/telegram/event`, `after` from `next/server`.

#### Step 1: Adjust the `CreatedAppointment` type to include relations

En `app/api/appointments/route.ts`, reemplazar `type CreatedAppointment = Awaited<ReturnType<typeof prisma.appointment.create>>;` por:

```ts
type CreatedAppointment = Prisma.AppointmentGetPayload<{
  include: { client: true; barber: true; service: true };
}>;
```

#### Step 2: Add the notification after create

En el `POST`, tras `const data = await createAppointment(...)` y antes de `return { data, status: 201 };`, añadir:

```ts
after(() => notifyAppointmentEvent("APPOINTMENT_CREATED", toTelegramEvent(data)));
```

Y añadir al header de imports:

```ts
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";
```

#### Step 3: Run typecheck

Run: `npm run typecheck`
Expected: PASS.

#### Step 4: Run the full unit suite

Run: `npx vitest run`
Expected: all existing + new tests pass.

#### Step 5: Commit

```bash
git add app/api/appointments/route.ts
git commit -m "feat(telegram): notify staff on appointment creation"
```

---

### Task 7: Wire `PATCH /api/appointments/[id]` (confirmar / completar)

**Files:**
- Modify: `app/api/appointments/[id]/route.ts`
- Test: `npm run typecheck`.

**Interfaces:**
- Uses `notifyAppointmentEvent`, `toTelegramEvent`, `after`.

#### Step 1: Add imports and notification on status transition

En `app/api/appointments/[id]/route.ts`:

1. Header de imports:
```ts
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";
```

2. En el `PATCH`, ampliar la lectura de `existing` para incluir `status`:
```ts
const existing = await prisma.appointment.findUnique({
  where: { id },
  select: { id: true, status: true },
});
```

3. Tras `const data = await prisma.appointment.update({ ... include: { client: true, barber: true, service: true } });` y antes del `return`, añadir:
```ts
if (body.status && body.status !== existing.status) {
  const type =
    body.status === "CONFIRMED"
      ? "APPOINTMENT_CONFIRMED"
      : body.status === "COMPLETED"
        ? "APPOINTMENT_COMPLETED"
        : null;
  if (type) after(() => notifyAppointmentEvent(type, toTelegramEvent(data)));
}
```

#### Step 2: Run typecheck

Run: `npm run typecheck`
Expected: PASS.

#### Step 3: Run the full unit suite

Run: `npx vitest run`
Expected: PASS.

#### Step 4: Commit

```bash
git add app/api/appointments/[id]/route.ts
git commit -m "feat(telegram): notify staff on appointment confirm/complete"
```

---

## Self-Review

**Spec coverage (v4):**
- Config env (sección 4) → Task 3 (token) + Task 5 (chat_id) + `.env.example` (ya añadido).
- Esquema de evento (sección 2.1) → Task 1.
- Servicio de notificaciones (sección 3.1–3.4) → Tasks 2, 3, 4, 5.
- Integración real en endpoints (sección 6) → Tasks 6, 7.
- Manejo de errores (sección 7) → Task 3 (mapeo) + Task 5 (no lanza).
- Criterios de aceptación → cubiertos por las tareas; la transición-real-de-estado se refleja en Task 7.
- Opción A (no migración) → respetado; Opción B queda documentada en el spec y no se implementa.

**Placeholder scan:** sin `TBD`/`handle edge cases` genéricos; todo paso trae código real.

**Type consistency:** `AppointmentEvent`/`NotificationType` definidos en Task 1 y usados en 2/4/5 con los mismos campos (`clientName`, `barberName`, `serviceName`, `startsAt`). `SendResult` en Task 3. `AppointmentWithRelations` en Task 4. `notifyAppointmentEvent(type, event)` idéntico en Task 5/6/7. `toTelegramEvent(data)` recibe el payload con relaciones que devuelve el `create`/`update` (verificado: `Prisma.AppointmentGetPayload<{ include: { client; barber; service } }>`).
