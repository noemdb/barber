# SPEC-2026-08-31-04 — Notificaciones por Telegram a un chat único (staff)

**Reemplaza a:** SPEC-2026-08-29-03
**Adaptado al entorno real:** `barberservice` — Next.js **16.3.1** (App Router), Prisma **7.4** + Neon adapter, Zod **4.4.3**, auth JWT (`jose`) con cookie `barberservice_session`, despliegue en Vercel.
**Consumidor de este documento:** agente de código (Cursor / Claude Code / Codex).

> Este spec es la versión **corregida para este repositorio** de la sección 8. Se verifica contra el código real en `prisma/schema.prisma`, `app/api/**`, `lib/` y el `.env.example`. No reimplementa nada que ya exista (`withApi`, `requireRole`, `getBusinessTimezone`, el service layer de citas): los reutiliza.

---

## 0. Delta de adaptación (qué cambió respecto a v3 y por qué)

| v3 asumía (abstracto) | Este repositorio (real) | Cambio aplicado |
|---|---|---|
| `Appointment.scheduledAt` como fecha | `Appointment.startsAt` (y `endsAt`) | El evento usa `startsAt` |
| `clientName`/`stylistName`/`service` como texto | Relaciones `client`/`barber`/`service` → `.name` | El evento se arma **incluyendo** las relaciones, no con campos de texto |
| `import "server-only"` en `lib/telegram/*` | `server-only` **no está instalado** | **Se elimina** la importación (rompería el build) |
| Rutas dedicadas `confirm/route.ts` y `complete/route.ts` | Un solo `PATCH /api/appointments/[id]` que cambia `status` (incluye `NO_SHOW`) | Integración vía **PATCH**, detectando transición de estado |
| Roles `Cliente/Estilista/Admin` | `User.role` = `OWNER/ADMIN/BARBER/CLIENT` | RBAC usa `requireRole("ADMIN","OWNER")` ya existente |
| Tabla `AppSettings` singleton (Opción B) | Ya existe `BusinessSettings` + página de settings | Opción B extiende `BusinessSettings.telegramChatId`, no crea tabla nueva |
| `es-VE` fijo en plantillas | `lib/time.ts#getBusinessTimezone()` (default `America/Caracas`) | Se usa la zona horaria del negocio |
| «si es serverless usar `after()`/`await`» | Despliegue **Vercel** (`vercel.json`) | Se usa **`after()`** de `next/server` (verificado: exportado) |

**Resultado:** v3 ya decidió el alcance correcto (un `chat_id` compartido, sin vinculación). v4 mantiene esa decisión y solo corrige _cómo se implementa_ en este repo.

---

## 1. Alcance

- **Un solo destino:** un `chat_id` (típicamente un grupo con admins + barberos) recibe las tres notificaciones.
- **Sin vinculación por usuario:** no hay deep link, webhook, ni campos `telegramChatId` por cliente/barbero. La configuración es de infraestructura.
- **Tres eventos:** `APPOINTMENT_CREATED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_COMPLETED`.
- **Regla de oro (sin cambios):** un fallo de Telegram **nunca** bloquea ni revierte crear/confirmar/completar una cita.

---

## 2. Modelo de datos

**No se necesita ninguna migración** para la Opción A (chat_id en variable de entorno). El esquema real ya tiene todo lo necesario para armar el mensaje:

```prisma
model Appointment {
  id        String            @id @default(cuid())
  startsAt  DateTime
  endsAt    DateTime
  status    AppointmentStatus @default(PENDING) // PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
  clientId  String
  barberId  String
  serviceId String
  client   Client   @relation(fields: [clientId], references: [id])
  barber   Barber   @relation(fields: [barberId], references: [id])
  service  Service  @relation(fields: [serviceId], references: [id])
  priceCents Int
}
```

Para construir el evento basta con `include: { client: true, barber: true, service: true }` — ya es lo que hacen la creación y el PATCH actuales (ver sección 6).

### 2.1 Zod schema del evento

```typescript
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

> Zod 4.4.3: `z.string().cuid("...")` y `z.coerce.date()` ya se usan en `lib/validations/index.ts` y `lib/services/appointment-service.test.ts` — son válidos.

---

## 3. Servicio de notificaciones

### 3.1 `sendTelegramMessage` — sin `server-only`

```typescript
// lib/telegram/notifier.ts
const TELEGRAM_API_BASE = "https://api.telegram.org";

interface SendResult {
  ok: boolean;
  errorCode?: number;
  errorReason?: "BOT_BLOCKED" | "CHAT_NOT_FOUND" | "NETWORK" | "UNKNOWN";
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<SendResult> {
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

### 3.2 Plantillas (zona horaria del negocio)

```typescript
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

### 3.3 Conversor de `Appointment` → `AppointmentEvent`

Es un helper que evita repetir el mapeo en cada endpoint:

```typescript
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

### 3.4 Orquestador — envía siempre al chat único

```typescript
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

  const chatId = process.env.TELEGRAM_CHAT_ID; // ver sección 5, Opción A
  if (!chatId) {
    console.error("[telegram] TELEGRAM_CHAT_ID no configurado, se omite notificación");
    return;
  }

  const timeZone = await getBusinessTimezone();
  const text = buildNotificationText(type, event, { timeZone });
  const result = await sendTelegramMessage(chatId, text);

  if (!result.ok) {
    // Chat fijo: 403/404 casi siempre es configuración incorrecta (bot fuera del
    // grupo, chat_id mal copiado), no un caso de negocio. Se loguea como alerta
    // operativa; no hay auto-recuperación posible con un solo chat.
    console.error(
      `[telegram] no se pudo enviar notificación ${type} (cita ${event.appointmentId}): ${result.errorReason}`
    );
  }
}
```

---

## 4. Variable de entorno

```bash
# .env.local
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=-1001234567890
```

**Nunca** commitear `.env.local`. Añadir a `.env.example` con valores vacíos (ya se documenta en la sección 8).

**Cómo obtener el `chat_id` (una sola vez, manual):**
1. Crear el bot con BotFather → `TELEGRAM_BOT_TOKEN`.
2. Agregar el bot al grupo de staff (o abrir chat directo con el bot desde la cuenta del admin).
3. Enviar un mensaje en ese chat/grupo.
4. Consultar `https://api.telegram.org/bot<TOKEN>/getUpdates` y leer `chat.id` (si es grupo, número negativo).
5. Guardarlo como `TELEGRAM_CHAT_ID`.

---

## 5. Fuente del chat_id

### Opción A (recomendada para empezar) — variable de entorno fija

Simple; cambiar el chat_id requiere redeploy. Es la que usa el orquestador de la sección 3.4.

### Opción B — editable desde el panel de admin (extensión)

Aquí **no** se crea una tabla nueva: se extiende la configuración de negocio que ya existe y ya tiene página de admin.

```prisma
// prisma/schema.prisma — añadir a BusinessSettings
model BusinessSettings {
  // ...campos existentes...
  telegramChatId String?
}
```

```bash
npx prisma migrate dev --name add_business_telegram_chat_id
```

```typescript
// lib/telegram/chat-id.ts
import { prisma } from "@/lib/prisma";

export async function getTelegramChatId(): Promise<string | null> {
  // Prioridad: configuración en BD > variable de entorno
  const settings = await prisma.businessSettings.findFirst({ select: { telegramChatId: true } });
  return settings?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID ?? null;
}
```

Cambia en el orquestador (3.4):

```typescript
const chatId = await getTelegramChatId();
```

Y se expone un campo editable en la página existente `app/(dashboard)/settings/page.tsx` + `app/api/settings/route.ts` (el `BusinessSettings` ya se guarda ahí; solo se agrega el campo al schema de edición). Ver sección 8, criterio 4.

---

## 6. Integración en los endpoints de citas

Los puntos de integración **reales** son el `POST` de creación y el `PATCH` de estado en `app/api/appointments/[id]/route.ts`. **No existen** rutas `confirm/` ni `complete/` — confirmar y completar son cambios de `status`.

Vercel es serverless → usar **`after()`** de `next/server` (verificado: `export { after } from 'next/dist/server/after'`). `next/server` ya se usa en el repo.

```typescript
// app/api/appointments/route.ts — fragmento (el resto queda igual)
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const body = appointmentCreateSchema.parse(await request.json().catch(() => null));
    const data = await createAppointment(appointmentRepo, {
      clientId: body.clientId,
      barberId: body.barberId,
      serviceId: body.serviceId,
      startsAt: new Date(body.startsAt),
      notes: body.notes ?? null,
    });

    // Fire-and-forget: no bloquea la respuesta HTTP; `after()` garantiza que
    // termine aunque la respuesta ya se haya enviado (entorno serverless).
    after(() => notifyAppointmentEvent("APPOINTMENT_CREATED", toTelegramEvent(data)));

    return { data, status: 201 };
  });
}
```

```typescript
// app/api/appointments/[id]/route.ts — fragmento relevante del PATCH
import { after } from "next/server";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";
import { toTelegramEvent } from "@/lib/telegram/event";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const body = appointmentPatchSchema.parse(await request.json().catch(() => null));
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new DomainError(ErrorCodes.NOT_FOUND, "Cita no encontrada", 404);

    const data = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { client: true, barber: true, service: true },
    });

    // Solo notifica en una transición real de estado (no al guardar sin cambios).
    if (body.status && body.status !== existing.status) {
      const type =
        body.status === "CONFIRMED"
          ? "APPOINTMENT_CONFIRMED"
          : body.status === "COMPLETED"
            ? "APPOINTMENT_COMPLETED"
            : null;
      if (type) after(() => notifyAppointmentEvent(type, toTelegramEvent(data)));
    }

    return { data };
  });
}
```

> **Nota sobre `NO_SHOW`/`CANCELLED`:** fuera de alcance. Solo `CONFIRMED` y `COMPLETED` disparan notificación; los demás cambios de estado no envían nada.

---

## 7. Manejo de errores — resumen

| Escenario | Comportamiento |
|---|---|
| `TELEGRAM_BOT_TOKEN` sin configurar | `sendTelegramMessage` devuelve `UNKNOWN`; el orquestador loguea error; la cita no se ve afectada |
| `TELEGRAM_CHAT_ID` sin configurar | El orquestador loguea error y **omite** el envío |
| Telegram responde 403 (bot fuera del grupo) | Alerta operativa → requiere intervención manual (volver a agregar el bot) |
| Telegram responde 400 chat not found | Alerta operativa → chat_id mal copiado o chat eliminado |
| Timeout / caída de red | Se loguea `NETWORK`; sin reintento automático en esta fase |
| Cualquier fallo de Telegram | **Nunca** bloquea ni revierte la operación de negocio |

Ojo: en `APPOINTMENT_CREATED` la notificación corre dentro de `after()`, que ya se ejecutó tras responder 201 — un fallo ahí solo deja un log, jamás un error de API.

---

## 8. Criterios de aceptación (entorno real)

- [ ] Existe una sola fuente de verdad para el `chat_id` (env var, o `BusinessSettings` si se adopta Opción B).
- [ ] Al crear una cita llega un mensaje `APPOINTMENT_CREATED` al chat configurado, con cliente, servicio, barbero y fecha (en la zona horaria del negocio).
- [ ] Al cambiar `status` a `CONFIRMED` (vía PATCH) llega `APPOINTMENT_CONFIRMED`, distinto al de creación.
- [ ] Al cambiar `status` a `COMPLETED` (vía PATCH) llega `APPOINTMENT_COMPLETED`.
- [ ] Un PATCH que no cambia el estado (p.ej. solo `notes`) **no** envía notificación.
- [ ] `NO_SHOW` y `CANCELLED` no envían notificación.
- [ ] Si `TELEGRAM_CHAT_ID` falta o es inválido, `POST /api/appointments` responde igual `201` y `PATCH [id]` responde `200` (el fallo de Telegram nunca se propaga).
- [ ] `import "server-only"` no aparece en ningún archivo nuevo (el paquete no está instalado).
- [ ] `after()` de `next/server` es lo que se usa para el fire-and-forget (no `void`).
- [ ] `TELEGRAM_*` solo existe en `.env`/`.env.example`, nunca hardcodeado ni expuesto al cliente.

---

## 9. Plan de implementación

**Fase 1 — Configuración (medio día)**
Crear bot con BotFather, agregarlo al chat/grupo de staff, obtener `chat_id` vía `getUpdates`, definir `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env.local`. Añadir ambas a `.env.example`.

**Fase 2 — Servicio (medio día)**
`lib/telegram/notifier.ts`, `templates.ts`, `schemas.ts`, `event.ts`, `notify-appointment.ts`. Probar los tres mensajes contra el chat real (puede ser un script temporal o un test de servicio con `fetch` mockeado, al estilo `lib/services/appointment-service.test.ts`).

**Fase 3 — Integración (medio día)**
Conectar en `POST /api/appointments` (crear) y en `PATCH /api/appointments/[id]` (confirmar/completar) vía `after()`. Validar el caso sin `TELEGRAM_CHAT_ID` (no rompe el flujo).

**Fase 4 — Opcional:** migrar a Opción B (`BusinessSettings.telegramChatId` + campo en `app/(dashboard)/settings/page.tsx` + `app/api/settings/route.ts`) para cambiar el chat destino sin redeploy.

**Fase 5 (futuro, fuera de alcance)** — Canal de notificación propio para clientes (WhatsApp Business / SMS / email — a definir).
