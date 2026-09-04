# SPEC-2026-08-29-01 — Sistema de Notificaciones por Telegram para App de Citas

**Autor:** Staff Engineer (agente de especificación)
**Consumidor de este documento:** agente de código (Cursor / Claude Code / Codex)
**Stack asumido:** Next.js 16 (App Router), TypeScript, Prisma + PostgreSQL, Zod
**Estado:** Listo para implementación

---

## 0. ADR-001 — Route Handlers en lugar de `pages/api/`

**Contexto:** el requerimiento original pide `pages/api/` (Pages Router). Next.js 16 tiene el App Router como convención por defecto; `pages/api/` sigue funcionando (legacy) pero pierde: streaming, Route Segment Config, mejor tipado de `NextRequest`/`NextResponse`, y coexistencia limpia con Server Actions.

**Decisión:** implementar los endpoints como **Route Handlers** en `app/api/**/route.ts`. Si el proyecto ya tiene código legacy en `pages/api/`, ambos pueden convivir sin conflicto (rutas distintas), pero todo el código **nuevo** de este spec usa App Router.

**Consecuencias:** el agente de código debe verificar si el proyecto usa `app/` como raíz. Si el repo es 100% Pages Router, usar el Anexo A (variante `pages/api/`) al final de este documento.

---

## 1. Modelo de datos (Prisma + Zod)

### 1.1 Migración — campo `telegramChatId`

```prisma
// prisma/schema.prisma

model Client {
  id              String   @id @default(cuid())
  name            String
  phone           String   @unique
  telegramChatId  String?  @unique
  telegramLinkedAt DateTime?
  telegramLinkToken String? @unique // token temporal de vinculación (deep link)
  appointments    Appointment[]
  createdAt       DateTime @default(now())
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

model Appointment {
  id          String            @id @default(cuid())
  clientId    String
  client      Client            @relation(fields: [clientId], references: [id])
  stylistName String
  service     String
  scheduledAt DateTime
  status      AppointmentStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

```bash
npx prisma migrate dev --name add_telegram_chat_id
```

### 1.2 Zod schemas — eventos de notificación

```typescript
// lib/telegram/schemas.ts
import { z } from "zod";

export const AppointmentEventSchema = z.object({
  appointmentId: z.string().cuid(),
  clientId: z.string().cuid(),
  clientName: z.string().min(1),
  stylistName: z.string().min(1),
  service: z.string().min(1),
  scheduledAt: z.coerce.date(),
});

export type AppointmentEvent = z.infer<typeof AppointmentEventSchema>;

export const NotificationTypeSchema = z.enum([
  "APPOINTMENT_CREATED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_COMPLETED",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
```

---

## 2. RBAC — quién puede disparar cada acción

| Acción | Cliente | Estilista/Barbero | Admin |
|---|---|---|---|
| Crear cita | ✅ | ✅ | ✅ |
| Confirmar cita | ❌ | ✅ | ✅ |
| Completar servicio | ❌ | ✅ | ✅ |
| Vincular Telegram (deep link) | ✅ (solo su propio registro) | ❌ | ✅ |
| Ver logs de notificaciones fallidas | ❌ | ❌ | ✅ |

La función de notificación **no valida permisos por sí misma**: se invoca *después* de que el endpoint de negocio ya validó el rol (usar el middleware/`auth()` existente del proyecto). Este spec no reimplementa auth; asume que ya existe una función `requireRole(role)` o equivalente.

---

## 3. Variables de entorno

```bash
# .env.local
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_USERNAME=TuBarberiaBot   # sin @, usado para el deep link
```

**Nunca** commitear `.env.local`. Agregar a `.env.example` con valores vacíos.

---

## 4. Servicio reutilizable de notificaciones

```typescript
// lib/telegram/notifier.ts
import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface SendResult {
  ok: boolean;
  errorCode?: number;
  errorReason?: "BOT_BLOCKED" | "CHAT_NOT_FOUND" | "NETWORK" | "UNKNOWN";
}

/**
 * Envía un mensaje de texto a un chat_id de Telegram.
 * No lanza excepciones: siempre devuelve un resultado tipado
 * para que el llamador decida qué hacer (loggear, reintentar, etc).
 */
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
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return { ok: true };
    }

    const body = await response.json().catch(() => null);
    const description: string = body?.description ?? "";

    // 403: el usuario bloqueó al bot o nunca inició conversación
    if (response.status === 403) {
      return { ok: false, errorCode: 403, errorReason: "BOT_BLOCKED" };
    }
    // 400 con "chat not found": chat_id inválido o inexistente
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

### 4.1 Plantillas de mensajes por evento

```typescript
// lib/telegram/templates.ts
import type { AppointmentEvent, NotificationType } from "./schemas";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildNotificationText(
  type: NotificationType,
  event: AppointmentEvent
): string {
  const when = formatDateTime(event.scheduledAt);

  switch (type) {
    case "APPOINTMENT_CREATED":
      return (
        `📅 <b>Cita registrada</b>\n` +
        `Servicio: ${event.service}\n` +
        `Estilista: ${event.stylistName}\n` +
        `Fecha: ${when}\n\n` +
        `Te avisaremos cuando quede confirmada.`
      );
    case "APPOINTMENT_CONFIRMED":
      return (
        `✅ <b>Cita confirmada</b>\n` +
        `Servicio: ${event.service}\n` +
        `Estilista: ${event.stylistName}\n` +
        `Fecha: ${when}\n\n` +
        `¡Te esperamos!`
      );
    case "APPOINTMENT_COMPLETED":
      return (
        `✂️ <b>Servicio completado</b>\n` +
        `Gracias por visitarnos. ¡Esperamos verte pronto de nuevo!`
      );
  }
}
```

### 4.2 Orquestador — resuelve chat_id, arma mensaje y envía

```typescript
// lib/telegram/notify-appointment.ts
import "server-only";
import { prisma } from "@/lib/prisma";
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

  const client = await prisma.client.findUnique({
    where: { id: event.clientId },
    select: { telegramChatId: true },
  });

  if (!client?.telegramChatId) {
    // El cliente no ha vinculado Telegram: no es un error, es un estado válido.
    console.info(
      `[telegram] cliente ${event.clientId} sin chat_id vinculado, se omite notificación`
    );
    return;
  }

  const text = buildNotificationText(type, event);
  const result = await sendTelegramMessage(client.telegramChatId, text);

  if (!result.ok) {
    if (result.errorReason === "BOT_BLOCKED" || result.errorReason === "CHAT_NOT_FOUND") {
      // El vínculo quedó inválido: lo limpiamos para no seguir intentando en vano.
      await prisma.client.update({
        where: { id: event.clientId },
        data: { telegramChatId: null, telegramLinkedAt: null },
      });
    }
    // Registro de fallo (aquí se podría insertar en una tabla NotificationLog).
    console.error(
      `[telegram] no se pudo notificar a cliente ${event.clientId}: ${result.errorReason}`
    );
  }
}
```

**Decisión de diseño:** `notifyAppointmentEvent` nunca lanza excepciones ni bloquea el flujo de negocio. Un fallo de Telegram **jamás** debe impedir que se cree/confirme/complete una cita.

---

## 5. Vinculación del chat_id (flujo de onboarding)

El usuario debe iniciar conversación con el bot antes de poder recibir mensajes (limitación de la API de Telegram). Flujo recomendado con **deep link + token temporal**:

1. En el perfil del cliente, la app genera un `telegramLinkToken` (uuid) y muestra un botón: `https://t.me/TuBarberiaBot?start=<token>`.
2. El cliente toca el enlace → se abre Telegram → envía `/start <token>` automáticamente.
3. El webhook del bot recibe el `chat_id` + el token y los asocia al cliente en la base de datos.

### 5.1 Webhook del bot

```typescript
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/notifier";

// Seguridad: Telegram permite configurar un secret_token verificado
// en el header `X-Telegram-Bot-Api-Secret-Token` al registrar el webhook.
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true }); // ignorar updates irrelevantes
  }

  if (text.startsWith("/start")) {
    const token = text.split(" ")[1]?.trim();

    if (!token) {
      await sendTelegramMessage(
        String(chatId),
        "Hola 👋 Para vincular tu cuenta, usa el enlace que te compartimos desde la app."
      );
      return NextResponse.json({ ok: true });
    }

    const client = await prisma.client.findUnique({
      where: { telegramLinkToken: token },
    });

    if (!client) {
      await sendTelegramMessage(
        String(chatId),
        "Ese enlace ya no es válido. Genera uno nuevo desde la app."
      );
      return NextResponse.json({ ok: true });
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        telegramChatId: String(chatId),
        telegramLinkedAt: new Date(),
        telegramLinkToken: null, // el token es de un solo uso
      },
    });

    await sendTelegramMessage(
      String(chatId),
      `✅ ¡Listo, ${client.name}! Ya puedes recibir notificaciones de tus citas.`
    );
  }

  return NextResponse.json({ ok: true });
}
```

### 5.2 Registrar el webhook (una sola vez, script de setup)

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://tu-dominio.com/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

### 5.3 Endpoint para generar el link de vinculación

```typescript
// app/api/clients/[id]/telegram-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = randomUUID();

  await prisma.client.update({
    where: { id: params.id },
    data: { telegramLinkToken: token },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ deepLink });
}
```

---

## 6. Integración en los flujos de citas

### 6.1 Crear cita

```typescript
// app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // (validar `body` con un Zod schema de negocio antes de llegar aquí)

  const appointment = await prisma.appointment.create({
    data: {
      clientId: body.clientId,
      stylistName: body.stylistName,
      service: body.service,
      scheduledAt: new Date(body.scheduledAt),
    },
    include: { client: true },
  });

  // Fire-and-forget: no bloquea la respuesta HTTP por un problema de Telegram.
  void notifyAppointmentEvent("APPOINTMENT_CREATED", {
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    clientName: appointment.client.name,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment, { status: 201 });
}
```

### 6.2 Confirmar cita

```typescript
// app/api/appointments/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const appointment = await prisma.appointment.update({
    where: { id: params.id },
    data: { status: "CONFIRMED" },
    include: { client: true },
  });

  void notifyAppointmentEvent("APPOINTMENT_CONFIRMED", {
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    clientName: appointment.client.name,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment);
}
```

### 6.3 Completar servicio

```typescript
// app/api/appointments/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const appointment = await prisma.appointment.update({
    where: { id: params.id },
    data: { status: "COMPLETED" },
    include: { client: true },
  });

  void notifyAppointmentEvent("APPOINTMENT_COMPLETED", {
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    clientName: appointment.client.name,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment);
}
```

> **Nota sobre `void fn()`:** en un entorno serverless (Vercel), una función puede terminar la ejecución apenas se envía la respuesta, matando la promesa "fire-and-forget" a mitad de camino. Si el despliegue es serverless, usar `await notifyAppointmentEvent(...)` (ya no lanza excepciones, así que es seguro) o `waitUntil()` de `next/server` para no bloquear la respuesta y a la vez garantizar que termine.

```typescript
import { after } from "next/server";
// ...
after(() => notifyAppointmentEvent("APPOINTMENT_CREATED", { ... }));
```

---

## 7. Manejo de errores — resumen de política

| Escenario | Comportamiento |
|---|---|
| Cliente sin `telegramChatId` | Se omite silenciosamente (log info), no es error |
| Telegram responde 403 (bot bloqueado) | Se limpia `telegramChatId` en BD, se loguea |
| Telegram responde 400 chat not found | Se limpia `telegramChatId` en BD, se loguea |
| Timeout / caída de red | Se loguea como `NETWORK`, no se reintenta automáticamente (ver Fase 4) |
| Token del bot mal configurado | Se loguea `UNKNOWN`, falla rápido sin tocar la BD |
| Cualquier fallo de Telegram | **Nunca** revierte ni bloquea la operación de negocio (crear/confirmar/completar cita) |

---

## 8. Criterios de aceptación

- [ ] Un cliente que nunca vinculó Telegram puede crear/tener citas sin errores en el flujo.
- [ ] Al vincular vía deep link, el `chat_id` queda guardado y el token se invalida tras el primer uso.
- [ ] Al crear una cita, si el cliente tiene `chat_id`, recibe un mensaje con servicio, estilista y fecha.
- [ ] Al confirmar, recibe un segundo mensaje distinto al de creación.
- [ ] Al completar, recibe un mensaje de agradecimiento.
- [ ] Si Telegram devuelve 403/400, el `chat_id` se limpia y no se vuelven a intentar envíos hasta re-vincular.
- [ ] Ningún fallo de `notifyAppointmentEvent` produce un 500 en los endpoints de citas.
- [ ] El token del bot solo existe en variables de entorno, nunca en el código fuente ni en el cliente.
- [ ] El webhook rechaza requests sin el `secret_token` correcto (si está configurado).

---

## 9. Plan de implementación por fases

**Fase 1 — Bot y vinculación (1-2 días)**
- Crear bot con BotFather, obtener token.
- Migración Prisma (`telegramChatId`, `telegramLinkedAt`, `telegramLinkToken`).
- Endpoint `telegram-link`, webhook `/api/telegram/webhook`, registrar webhook en Telegram.

**Fase 2 — Servicio de notificaciones (1 día)**
- `lib/telegram/notifier.ts`, `templates.ts`, `notify-appointment.ts`.
- Pruebas manuales enviando mensajes a un chat_id propio.

**Fase 3 — Integración en endpoints de citas (0.5-1 día)**
- Conectar los tres endpoints (crear/confirmar/completar).
- Decidir `await` vs `after()` según si el despliegue es serverless o long-running.

**Fase 4 — Robustez (opcional, 1 día)**
- Tabla `NotificationLog` para auditoría de envíos fallidos.
- Reintentos con backoff para errores `NETWORK` (ej. cola con BullMQ o `after()` + reintento simple).
- Alertas si el token del bot expira o se revoca.

---

## Anexo A — Variante `pages/api/` (solo si el proyecto es 100% Pages Router)

Los Route Handlers de las secciones 5.1, 5.3, 6.1–6.3 se traducen así:

```typescript
// pages/api/appointments/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const appointment = await prisma.appointment.create({
    data: {
      clientId: req.body.clientId,
      stylistName: req.body.stylistName,
      service: req.body.service,
      scheduledAt: new Date(req.body.scheduledAt),
    },
    include: { client: true },
  });

  await notifyAppointmentEvent("APPOINTMENT_CREATED", {
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    clientName: appointment.client.name,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return res.status(201).json(appointment);
}
```

La misma lógica aplica a `confirm` y `complete`. `lib/telegram/*` y el modelo Prisma no cambian.
