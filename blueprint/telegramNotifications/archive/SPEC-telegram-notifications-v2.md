# SPEC-2026-08-29-02 — Notificaciones por Telegram para Staff (Admin/Barberos)

**Reemplaza a:** SPEC-2026-08-29-01
**Cambio de alcance:** el bot NO es para clientes. Es de uso exclusivo del administrador y los barberos de la barbería. Los clientes tendrán su propio canal de notificación en una versión futura (fuera de alcance de este spec).

Este documento reutiliza el servicio base de envío (`sendTelegramMessage`) del spec anterior sin cambios — la diferencia está en **el modelo de datos, quién se vincula al bot y quién recibe cada evento**.

---

## 0. ADR-002 — El chat_id pertenece al Staff, no al Cliente

**Contexto:** en el spec v1 se asumió `Client.telegramChatId`. Con el nuevo alcance, quien necesita recibir notificaciones es el barbero asignado a la cita y/o el administrador — el cliente no interactúa con el bot en absoluto.

**Decisión:** el campo `telegramChatId` se mueve a un modelo `StaffMember` (admin/barbero). `Client` queda sin ningún campo de Telegram.

**Consecuencia:** `Appointment` debe referenciar al barbero como una relación real (`stylistId → StaffMember`), no como texto libre (`stylistName`), porque ahora necesitamos resolver su `chat_id` para notificarlo.

---

## 1. Modelo de datos

```prisma
// prisma/schema.prisma

enum StaffRole {
  ADMIN
  BARBER
}

model StaffMember {
  id                String    @id @default(cuid())
  name              String
  role              StaffRole
  telegramChatId    String?   @unique
  telegramLinkedAt  DateTime?
  telegramLinkToken String?   @unique
  appointments      Appointment[] @relation("AssignedStaff")
  createdAt         DateTime  @default(now())
}

model Client {
  id           String        @id @default(cuid())
  name         String
  phone        String        @unique
  appointments Appointment[]
  createdAt    DateTime      @default(now())
  // Sin campos de Telegram: fuera de alcance en esta fase.
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
  stylistId   String
  stylist     StaffMember       @relation("AssignedStaff", fields: [stylistId], references: [id])
  service     String
  scheduledAt DateTime
  status      AppointmentStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

```bash
npx prisma migrate dev --name staff_telegram_chat_id
```

> Si `Appointment.stylistName` ya existe como texto libre en producción, la migración debe incluir un paso de backfill (crear/matchear `StaffMember` por nombre) antes de volver `stylistId` obligatorio.

### 1.1 Zod schema del evento (actualizado)

```typescript
// lib/telegram/schemas.ts
import { z } from "zod";

export const AppointmentEventSchema = z.object({
  appointmentId: z.string().cuid(),
  clientName: z.string().min(1),
  service: z.string().min(1),
  scheduledAt: z.coerce.date(),
  stylistId: z.string().cuid(),
  stylistName: z.string().min(1),
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

## 2. RBAC — vinculación y recepción

| Acción | Cliente | Barbero | Admin |
|---|---|---|---|
| Crear cita | ✅ (o front-desk) | ✅ | ✅ |
| Confirmar cita | ❌ | ✅ (solo las suyas) | ✅ (todas) |
| Completar servicio | ❌ | ✅ (solo las suyas) | ✅ (todas) |
| Vincular su propio Telegram | ❌ | ✅ (solo su cuenta) | ✅ (solo su cuenta) |
| Generar link de vinculación para otro staff | ❌ | ❌ | ✅ |
| Recibir notificación de cita creada | — | ✅ (si es el asignado) | ✅ (siempre) |
| Recibir notificación de cita confirmada | — | ✅ (si es el asignado) | ❌ (opcional, ver 3.1) |
| Recibir notificación de servicio completado | — | ❌ | ✅ (resumen operativo) |

### 2.1 Matriz de destinatarios por evento (regla de negocio por defecto)

| Evento | Destinatarios |
|---|---|
| `APPOINTMENT_CREATED` | Barbero asignado + todos los Admin |
| `APPOINTMENT_CONFIRMED` | Barbero asignado |
| `APPOINTMENT_COMPLETED` | Todos los Admin |

Esta matriz es una decisión de negocio, no técnica — ajústala en `getRecipients()` (sección 4.2) si el flujo real difiere (ej. si el admin también quiere ver confirmaciones).

---

## 3. Variables de entorno

Sin cambios respecto al spec v1:

```bash
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_USERNAME=TuBarberiaStaffBot
TELEGRAM_WEBHOOK_SECRET=un-secreto-largo-aleatorio
```

---

## 4. Servicio de notificaciones

### 4.1 `sendTelegramMessage` — sin cambios

Reutiliza exactamente la función del spec v1 (sección 4). No depende de si el destinatario es cliente o staff.

### 4.2 Resolución de destinatarios + orquestador

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

async function getRecipientChatIds(
  type: NotificationType,
  stylistId: string
): Promise<{ id: string; chatId: string }[]> {
  const admins = await prisma.staffMember.findMany({
    where: { role: "ADMIN", telegramChatId: { not: null } },
    select: { id: true, telegramChatId: true },
  });

  const stylist = await prisma.staffMember.findUnique({
    where: { id: stylistId },
    select: { id: true, telegramChatId: true },
  });

  const toRecipient = (s: { id: string; telegramChatId: string | null }) =>
    s.telegramChatId ? { id: s.id, chatId: s.telegramChatId } : null;

  switch (type) {
    case "APPOINTMENT_CREATED":
      return [stylist, ...admins].map(toRecipient).filter((r) => r !== null) as any;
    case "APPOINTMENT_CONFIRMED":
      return [stylist].map(toRecipient).filter((r) => r !== null) as any;
    case "APPOINTMENT_COMPLETED":
      return admins.map(toRecipient).filter((r) => r !== null) as any;
  }
}

export async function notifyAppointmentEvent(
  rawType: NotificationType,
  rawEvent: AppointmentEvent
): Promise<void> {
  const type = NotificationTypeSchema.parse(rawType);
  const event = AppointmentEventSchema.parse(rawEvent);

  const recipients = await getRecipientChatIds(type, event.stylistId);

  if (recipients.length === 0) {
    console.info(
      `[telegram] sin destinatarios con chat_id vinculado para evento ${type} (cita ${event.appointmentId})`
    );
    return;
  }

  const text = buildNotificationText(type, event);

  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await sendTelegramMessage(recipient.chatId, text);
      if (!result.ok) {
        if (result.errorReason === "BOT_BLOCKED" || result.errorReason === "CHAT_NOT_FOUND") {
          await prisma.staffMember.update({
            where: { id: recipient.id },
            data: { telegramChatId: null, telegramLinkedAt: null },
          });
        }
        console.error(
          `[telegram] fallo notificando a staff ${recipient.id} (${type}): ${result.errorReason}`
        );
      }
    })
  );
}
```

### 4.3 Plantillas (ahora orientadas a staff, no al cliente final)

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

---

## 5. Vinculación del chat_id (staff, no clientes)

El flujo de deep link es el mismo mecanismo del spec v1, pero ahora vive en el **panel interno** (admin/barbero), no en el perfil del cliente.

- Solo un Admin puede generar el link de vinculación para un `StaffMember` (ver RBAC, sección 2).
- Un barbero solo puede generar/ver el link para vincular **su propia cuenta**.

```typescript
// app/api/staff/[id]/telegram-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
// import { requireRole, requireSelfOrAdmin } from "@/lib/auth"; // usar el auth existente del proyecto

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // requireSelfOrAdmin(req, params.id) — validar que quien pide es Admin o el propio staff member

  const token = randomUUID();

  await prisma.staffMember.update({
    where: { id: params.id },
    data: { telegramLinkToken: token },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ deepLink });
}
```

El webhook (`app/api/telegram/webhook/route.ts`) es idéntico al del spec v1, cambiando únicamente `prisma.client` → `prisma.staffMember`:

```typescript
// app/api/telegram/webhook/route.ts (solo el fragmento que cambia)
const staffMember = await prisma.staffMember.findUnique({
  where: { telegramLinkToken: token },
});

if (!staffMember) {
  await sendTelegramMessage(String(chatId), "Ese enlace ya no es válido. Pídele a un admin uno nuevo.");
  return NextResponse.json({ ok: true });
}

await prisma.staffMember.update({
  where: { id: staffMember.id },
  data: { telegramChatId: String(chatId), telegramLinkedAt: new Date(), telegramLinkToken: null },
});

await sendTelegramMessage(
  String(chatId),
  `✅ ¡Listo, ${staffMember.name}! Ya recibirás las notificaciones de citas que te correspondan.`
);
```

---

## 6. Integración en los endpoints de citas

Idéntica estructura al spec v1 (sección 6), con dos cambios:

1. El evento ahora incluye `stylistId` (no solo `stylistName`), porque `getRecipientChatIds` lo necesita para resolver el chat_id del barbero.
2. `clientName` se toma de `appointment.client.name` para mostrarlo al staff (el cliente ya no es destinatario, pero sigue siendo el sujeto del mensaje).

```typescript
// app/api/appointments/route.ts (fragmento relevante, resto sin cambios)
const appointment = await prisma.appointment.create({
  data: {
    clientId: body.clientId,
    stylistId: body.stylistId,
    service: body.service,
    scheduledAt: new Date(body.scheduledAt),
  },
  include: { client: true, stylist: true },
});

void notifyAppointmentEvent("APPOINTMENT_CREATED", {
  appointmentId: appointment.id,
  clientName: appointment.client.name,
  service: appointment.service,
  scheduledAt: appointment.scheduledAt,
  stylistId: appointment.stylistId,
  stylistName: appointment.stylist.name,
});
```

El mismo patrón (agregar `stylistId`/`stylistName` desde `appointment.stylist`) aplica a `confirm` y `complete`.

---

## 7. Manejo de errores

Sin cambios de política respecto al spec v1 (sección 7): un fallo de Telegram nunca bloquea la operación de negocio. Único ajuste: la limpieza de `chat_id` inválido ahora ocurre sobre `StaffMember`, y como un evento puede tener varios destinatarios, cada uno se resuelve y limpia de forma independiente (`Promise.all`, ver 4.2).

---

## 8. Criterios de aceptación (actualizados)

- [ ] `Client` no tiene ningún campo de Telegram.
- [ ] Solo un Admin puede generar el link de vinculación de otro staff; un barbero solo puede generar el suyo propio.
- [ ] Al crear una cita, reciben notificación el barbero asignado (si tiene chat_id) y todos los admins con chat_id.
- [ ] Al confirmar, solo el barbero asignado recibe notificación.
- [ ] Al completar, solo los admins reciben notificación.
- [ ] Si un barbero o admin nunca vinculó su Telegram, el evento se omite para él sin generar error.
- [ ] Si Telegram devuelve 403/400 para un destinatario, se limpia su `chat_id` sin afectar el envío a los demás destinatarios del mismo evento.
- [ ] Ningún cliente puede, por ningún medio de la app actual, iniciar o recibir mensajes del bot.

---

## 9. Plan de implementación (ajustado)

**Fase 1** — Migración de datos: crear `StaffMember`, migrar `Appointment.stylistName` → `stylistId`, eliminar cualquier campo de Telegram de `Client` si ya existía.
**Fase 2** — Bot, webhook y endpoint de vinculación para staff (con chequeo de rol).
**Fase 3** — `notifier.ts`, `templates.ts`, `notify-appointment.ts` con la matriz de destinatarios de la sección 2.1.
**Fase 4** — Integrar en los tres endpoints de citas, validando que `stylistId` viaje en el payload.
**Fase 5 (futuro, fuera de este spec)** — Canal de notificación propio para clientes (WhatsApp Business API, SMS, o email — a definir).
