# SPEC-2026-08-29-03 — Notificaciones por Telegram a un único chat (Admin/Barberos)

**Reemplaza a:** SPEC-2026-08-29-02
**Cambio de alcance:** no hay vinculación por barbero/admin. Existe **un único `chat_id`** (típicamente un grupo de Telegram con el admin y los barberos como miembros) al que se envían las tres notificaciones. Esto elimina toda la sección de vinculación (deep link + webhook) del spec v2.

---

## 0. ADR-003 — Un chat_id compartido, no vinculación por usuario

**Contexto:** en v2 cada `StaffMember` vinculaba su propio Telegram vía deep link + webhook, y cada evento resolvía una lista de destinatarios. El requerimiento real es más simple: un solo destino.

**Decisión:** el `chat_id` se guarda como configuración global, no como atributo de ningún usuario. Se elimina por completo: `StaffMember.telegramChatId`, el webhook `/api/telegram/webhook`, el endpoint de generación de deep link, y `getRecipientChatIds()`.

**Cómo obtener ese chat_id (una sola vez, manual):**
1. Crear el bot con BotFather → obtener `TELEGRAM_BOT_TOKEN`.
2. Agregar el bot al grupo de Telegram del staff (o iniciar un chat directo con el bot desde la cuenta del admin).
3. Enviar cualquier mensaje en ese chat/grupo.
4. Consultar `https://api.telegram.org/bot<TOKEN>/getUpdates` y leer el campo `chat.id` de la respuesta (si es un grupo, será un número negativo).
5. Guardar ese valor como `TELEGRAM_CHAT_ID`.

**Consecuencia:** ya no hace falta ningún flujo de onboarding en la app. La configuración es de infraestructura, no de producto.

---

## 1. Configuración

### Opción A (recomendada para empezar) — variable de entorno fija

```bash
# .env.local
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=-1001234567890
```

Simple, pero cambiar el chat_id requiere redeploy.

### Opción B — configuración editable desde el panel de admin

Si en algún momento quieres poder cambiar el chat destino sin redeploy (ej. probar en un chat de pruebas y luego pasar al grupo real), usa una tabla de configuración de una sola fila:

```prisma
// prisma/schema.prisma
model AppSettings {
  id             Int     @id @default(1) // singleton: siempre id=1
  telegramChatId String?
}
```

```typescript
// lib/telegram/get-chat-id.ts
import { prisma } from "@/lib/prisma";

export async function getTelegramChatId(): Promise<string | null> {
  // Prioridad: configuración en BD > variable de entorno
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return settings?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID ?? null;
}
```

Este spec usa la **Opción A** en los ejemplos de código por simplicidad; si adoptas la Opción B, solo hay que reemplazar `process.env.TELEGRAM_CHAT_ID` por `await getTelegramChatId()` en el orquestador (sección 3).

---

## 2. Modelo de datos (simplificado)

Ya no se necesita `StaffMember` para Telegram. El único requisito de datos es poder armar el mensaje (nombre del barbero, servicio, cliente, hora), que ya existe en `Appointment`.

```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

model Appointment {
  id          String            @id @default(cuid())
  clientName  String
  stylistName String
  service     String
  scheduledAt DateTime
  status      AppointmentStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

> Si en tu esquema real `clientName`/`stylistName` son relaciones (`Client`, `StaffMember` sin campos de Telegram), no hay ningún cambio adicional: solo asegúrate de incluirlas (`include: { client: true, stylist: true }`) al armar el evento.

### 2.1 Zod schema del evento

```typescript
// lib/telegram/schemas.ts
import { z } from "zod";

export const AppointmentEventSchema = z.object({
  appointmentId: z.string().cuid(),
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

## 3. Servicio de notificaciones

### 3.1 `sendTelegramMessage` — idéntico al spec original

```typescript
// lib/telegram/notifier.ts
import "server-only";

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

### 3.2 Plantillas de mensaje

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
        `🆕 <b>Nueva cita registrada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.service}\n` +
        `Barbero: ${event.stylistName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_CONFIRMED":
      return (
        `✅ <b>Cita confirmada</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Servicio: ${event.service}\n` +
        `Barbero: ${event.stylistName}\n` +
        `Fecha: ${when}`
      );
    case "APPOINTMENT_COMPLETED":
      return (
        `✂️ <b>Servicio completado</b>\n` +
        `Cliente: ${event.clientName}\n` +
        `Barbero: ${event.stylistName}\n` +
        `Servicio: ${event.service}`
      );
  }
}
```

### 3.3 Orquestador — envía siempre al chat único

```typescript
// lib/telegram/notify-appointment.ts
import "server-only";
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

  const chatId = process.env.TELEGRAM_CHAT_ID; // o `await getTelegramChatId()` si usas Opción B
  if (!chatId) {
    console.error("[telegram] TELEGRAM_CHAT_ID no configurado, se omite notificación");
    return;
  }

  const text = buildNotificationText(type, event);
  const result = await sendTelegramMessage(chatId, text);

  if (!result.ok) {
    // Con un solo chat_id fijo, un 403/404 casi siempre significa configuración
    // incorrecta (bot removido del grupo, chat_id mal copiado), no un caso de
    // negocio esperado — por eso aquí se loguea como alerta operativa, no se
    // "limpia" nada en base de datos como se hacía por-usuario en v2.
    console.error(
      `[telegram] no se pudo enviar notificación ${type} (cita ${event.appointmentId}): ${result.errorReason}`
    );
  }
}
```

**Decisión de diseño (sin cambios respecto a v1/v2):** un fallo de Telegram nunca bloquea ni revierte la creación/confirmación/completado de la cita.

---

## 4. Integración en los endpoints de citas

```typescript
// app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentEvent } from "@/lib/telegram/notify-appointment";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const appointment = await prisma.appointment.create({
    data: {
      clientName: body.clientName,
      stylistName: body.stylistName,
      service: body.service,
      scheduledAt: new Date(body.scheduledAt),
    },
  });

  void notifyAppointmentEvent("APPOINTMENT_CREATED", {
    appointmentId: appointment.id,
    clientName: appointment.clientName,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment, { status: 201 });
}
```

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
  });

  void notifyAppointmentEvent("APPOINTMENT_CONFIRMED", {
    appointmentId: appointment.id,
    clientName: appointment.clientName,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment);
}
```

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
  });

  void notifyAppointmentEvent("APPOINTMENT_COMPLETED", {
    appointmentId: appointment.id,
    clientName: appointment.clientName,
    stylistName: appointment.stylistName,
    service: appointment.service,
    scheduledAt: appointment.scheduledAt,
  });

  return NextResponse.json(appointment);
}
```

> **Nota serverless (Vercel):** igual que en v1/v2, si el despliegue es serverless preferir `await notifyAppointmentEvent(...)` (ya no lanza excepciones) o `after()` de `next/server` en vez de `void fn()`, para evitar que la función termine antes de que el envío se complete.

---

## 5. RBAC — quién dispara cada acción

Con un solo chat_id no hay RBAC de "vinculación" (ya no existe esa operación). Solo queda el control de acceso normal sobre las acciones de negocio:

| Acción | Cliente | Barbero | Admin |
|---|---|---|---|
| Crear cita | ✅ (o front-desk) | ✅ | ✅ |
| Confirmar cita | ❌ | ✅ | ✅ |
| Completar servicio | ❌ | ✅ | ✅ |
| Ver/editar `TELEGRAM_CHAT_ID` (Opción B) | ❌ | ❌ | ✅ |

---

## 6. Manejo de errores — resumen

| Escenario | Comportamiento |
|---|---|
| `TELEGRAM_CHAT_ID` no configurado | Se loguea como error de configuración, se omite el envío, no afecta la cita |
| Telegram responde 403 (bot removido del grupo/chat) | Se loguea como alerta operativa — requiere intervención manual (volver a agregar el bot), no hay auto-recuperación posible con un chat fijo |
| Telegram responde 400 chat not found | Igual al caso anterior: alerta operativa, no un estado transitorio esperado |
| Timeout / caída de red | Se loguea como `NETWORK`; considerar reintento simple en Fase 2 (ver sección 7) |
| Cualquier fallo de Telegram | Nunca bloquea ni revierte la operación de negocio |

---

## 7. Criterios de aceptación

- [ ] Existe una única fuente de verdad para el `chat_id` (env var, o `AppSettings` si se adopta Opción B).
- [ ] Al crear, confirmar o completar una cita, llega exactamente un mensaje al chat configurado, con el texto correspondiente a cada evento.
- [ ] Si `TELEGRAM_CHAT_ID` falta o es inválido, la operación de negocio (crear/confirmar/completar) responde igual con éxito (200/201).
- [ ] No existe ningún flujo de vinculación, webhook, ni tabla de staff para Telegram en el código.
- [ ] El token del bot y el chat_id solo existen en variables de entorno (o en `AppSettings`, nunca hardcodeados ni expuestos al cliente).

---

## 8. Plan de implementación

**Fase 1 (medio día)** — Crear el bot en BotFather, agregarlo al grupo/chat de staff, obtener el `chat_id` con `getUpdates`, configurar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.

**Fase 2 (medio día)** — Implementar `notifier.ts`, `templates.ts`, `notify-appointment.ts`. Probar los tres tipos de mensaje manualmente contra el chat real.

**Fase 3 (medio día)** — Integrar en los tres endpoints de citas (crear/confirmar/completar).

**Fase 4 (opcional)** — Si se quiere evitar redeploy para cambiar el chat destino, migrar a la Opción B (`AppSettings` + endpoint admin para editarlo).

**Fase 5 (futuro, fuera de alcance)** — Canal de notificación propio para clientes.
