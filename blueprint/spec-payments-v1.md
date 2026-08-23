# Spec-Driven Development — BarberService: Pagos v1

## 1. Misión

Actúa como **Staff Engineer / Principal Software Engineer especializado en Next.js full-stack, arquitectura SaaS, PostgreSQL, Prisma y Vercel**.

Tu misión es implementar mejoras al sistema de pagos de **BarberService**, una plataforma web de gestión integral para barberías, preservando arquitectura, consistencia, seguridad, mantenibilidad y reglas de negocio existentes.

---

## 2. Objetivo del cambio

Transformar el endpoint de pagos actual (hardcoded, inflexible) en una API robusta que soporte:
- Método de pago configurable (CASH, CARD, TRANSFER, OTHER)
- Un único cobro por cita, que puede ser menor al precio como anticipo
- Notas de pago (referencias, últimos 4 dígitos, etc.)
- Separación opcional entre "pagado" y "completado"
- Validaciones de dominio consistentes
- Preparación para futuros endpoints (reembolsos, cuotas, integraciones)

---

## 3. Decisiones de alcance

Estas decisiones cierran ambigüedades del modelo actual y son obligatorias para v1:

- `Payment.appointmentId` continúa siendo `@unique`. v1 registra como máximo un pago por cita. Un pago parcial es un anticipo; v1 no registra ni calcula el saldo ni permite un segundo cobro.
- Los descuentos no forman parte de v1. Un monto menor al precio no representa un descuento: representa un anticipo y no completa la cita.
- `completeAppointment` solo puede completar la cita cuando el pago es `PAID` y `amountCents === appointment.priceCents`. Un anticipo o un pago `PENDING` nunca marca la cita como `COMPLETED`.
- Una cita `CANCELLED` o `NO_SHOW` no acepta pagos, independientemente de `completeAppointment`.
- Registrar pagos es una mutación administrativa y requiere `ADMIN` u `OWNER`, conforme a `blueprint/CHANGELOG.md`. `BARBER` no está autorizado en v1.
- `notes` forma parte de v1 y requiere una migración Prisma. No se puede declarar “sin migración” mientras el campo esté en el contrato.
- La compatibilidad heredada acepta el body actual `{ "id": "..." }` además del nuevo `{ "appointmentId": "..." }`. La respuesta siempre usa el envelope estándar actual.

## 4. Principios de ingeniería obligatorios

### 4.1. Source of Truth
La implementación existente es la fuente primaria de verdad para nombres, convenciones, tipos, contratos, estructura y reglas.

### 4.2. No romper comportamiento existente
Toda modificación debe minimizar regresiones. El endpoint debe seguir funcionando para clientes que envíen solo el body heredado `{ "id": "..." }`, con los defaults del pago completo en efectivo.

### 4.3. Separación de responsabilidades
- **Validación**: Zod schemas en `lib/validations/index.ts`
- **Reglas de dominio**: Service layer en `lib/services/payment-service.ts` (nuevo)
- **Adaptador HTTP**: Route handler en `app/api/payments/route.ts`
- **Errores**: `DomainError` con códigos consistentes

### 4.4. Type safety
Eliminar `any`; usar tipos inferidos de Prisma y Zod.

---

## 5. Análisis del estado actual

### 5.1. Modelo Prisma (`prisma/schema.prisma`)
```prisma
model Payment {
  id            String        @id @default(cuid())
  appointmentId String        @unique
  amountCents   Int
  method        PaymentMethod // CASH | CARD | TRANSFER | OTHER
  status        PaymentStatus @default(PAID)  // PENDING | PAID | REFUNDED
  paidAt        DateTime?
  notes         String?
  appointment   Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

### 5.2. Endpoint actual (`app/api/payments/route.ts`)
- POST `/api/payments`
- Solo `id` en body (el contrato objetivo usará `appointmentId`)
- Hardcoded: `method: "CASH"`, `status: "PAID"`, `amountCents: appointment.priceCents`, `paidAt: new Date()`
- Transacción: crea Payment + actualiza Appointment a `COMPLETED`
- Valida: cita existe, no tiene pago previo
- Auth: el endpoint actual llama `requireStaff()`; la versión alineada con la política vigente debe usar `requireRole("ADMIN", "OWNER")`

### 5.3. Validaciones actuales (`lib/validations/index.ts`)
- `appointmentCreateSchema`, `appointmentPatchSchema`, etc.
- **No existe** schema para pagos

### 5.4. Service layer
- Existe `lib/services/appointment-service.ts` para citas
- **No existe** service layer para pagos

---

## 6. Especificación funcional

### 6.1. Request body (POST `/api/payments`)

```typescript
// Input Zod schema
const paymentCreateSchema = z.object({
  appointmentId: z.string().cuid("ID de cita inválido").optional(),
  id: z.string().cuid("ID de cita inválido").optional(), // compatibilidad heredada

  // Opcionales con defaults que replican comportamiento actual
  amountCents: z.number()
    .int("El monto debe ser entero")
    .positive("El monto debe ser positivo")
    .optional(), // default: appointment.priceCents

  method: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"])
    .default("CASH"),

  status: z.enum(["PENDING", "PAID"])
    .default("PAID"), // REFUNDED no permitido en creación

  paidAt: z.coerce.date().optional(), // default: now() si status=PAID

  notes: z.string().trim().max(500, "Máximo 500 caracteres").nullable().optional(),

  completeAppointment: z.boolean().default(true), // solo válido con pago PAID completo
});
```

El schema debe transformar `id` a `appointmentId` y rechazar cuando faltan ambos o se envían
ambos con valores diferentes. El tipo de salida solo debe exponer `appointmentId`.

### 6.2. Reglas de negocio (Payment Service)

| Regla | Descripción |
|-------|-------------|
| **R1** | La cita debe existir y no estar `CANCELLED` ni `NO_SHOW` |
| **R2** | La cita no debe tener pago previo (`Payment` único por `appointmentId`) |
| **R3** | `amountCents` ≤ `appointment.priceCents` (no sobrepagar) |
| **R4** | Si `status === "PAID"`, `paidAt` es obligatorio (default: `now()`) |
| **R5** | Si `status === "PENDING"`, `paidAt` debe ser `null` |
| **R6** | `completeAppointment=true` exige `status=PAID` y pago completo; además, la cita no puede estar `CANCELLED` ni `NO_SHOW` |
| **R7** | Transacción atómica: crear Payment + (opcional) actualizar Appointment |
| **R8** | Auditoría monetaria queda fuera de v1; debe documentarse que no se persiste `processedBy` |
| **R9** | Un `P2002` por concurrencia en `appointmentId` debe mapearse a `APPOINTMENT_ALREADY_PAID` (409) |

### 6.3. Response exitosa

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "cuid...",
      "appointmentId": "cuid...",
      "amountCents": 1500,
      "method": "CARD",
      "status": "PAID",
      "paidAt": "2026-08-22T15:30:00.000Z",
      "notes": "Ref: 123456789",
      "createdAt": "2026-08-22T15:30:00.000Z"
    },
    "appointment": {
      "id": "cuid...",
      "status": "COMPLETED"
    }
  }
}
```

### 6.4. Errores de dominio

| Código | HTTP | Cuándo |
|--------|------|--------|
| `VALIDATION_ERROR` | 400 | Body inválido, monto > priceCents, paidAt con PENDING, etc. |
| `UNAUTHORIZED` | 401 | Sin sesión válida |
| `FORBIDDEN` | 403 | Rol no permitido (requiere ADMIN u OWNER) |
| `NOT_FOUND` | 404 | Cita no existe |
| `APPOINTMENT_ALREADY_PAID` | 409 | Cita ya tiene Payment |
| `INVALID_APPOINTMENT_STATUS` | 409 | Cita `CANCELLED` o `NO_SHOW`, independientemente de `completeAppointment` |
| `INTERNAL_ERROR` | 500 | Error inesperado |

---

## 7. Modelo de datos

Se requiere agregar el campo siguiente al modelo `Payment` y crear una migración:

```prisma
notes String?
```

Después de aplicar la migración debe regenerarse el cliente Prisma. El `@unique` existente en
`appointmentId` se conserva deliberadamente para imponer un solo pago por cita en v1.

**Migraciones futuras (v2+):**
- `Payment.reference` (String?) — referencia externa
- `Payment.processedBy` (String?) — FK a User
- `PaymentInstallment` — para pagos a plazos

---

## 8. Arquitectura

### 8.1. Nuevo archivo: `lib/services/payment-service.ts`

```typescript
// Interfaz para inyección de dependencias (testabilidad)
export interface PaymentRepository {
  findAppointmentWithPayment(appointmentId: string): Promise<AppointmentWithPayment | null>;
  createPayment(data: CreatePaymentData): Promise<Payment>;
  updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<void>;
}

export interface CreatePaymentInput {
  appointmentId: string;
  amountCents?: number;      // default: appointment.priceCents
  method?: PaymentMethod;    // default: CASH
  status?: PaymentStatus;    // default: PAID (no REFUNDED)
  paidAt?: Date | null;      // default: now() si PAID, null si PENDING
  notes?: string | null;
  completeAppointment?: boolean; // default: true
}

export interface CreatePaymentResult {
  payment: Payment;
  appointment: { id: string; status: AppointmentStatus };
}

// Funciones puras exportadas para testing
export function validatePaymentAmount(amountCents: number, maxCents: number): void;
export function validatePaidAt(status: PaymentStatus, paidAt: Date | null): void;
export function validateAppointmentForPayment(appointment: AppointmentWithPayment, completeAppointment: boolean): void;

// Función principal
export async function createPayment<T>(
  repo: PaymentRepository<T>,
  input: CreatePaymentInput
): Promise<CreatePaymentResult>;
```

La interfaz debe modelar la transacción real. Preferiblemente el repositorio expone una operación
transaccional (`runInTransaction`) o el service recibe un cliente transaccional; no debe hacer una
lectura previa fuera de la transacción y asumir que esa lectura evita duplicados. El service debe
capturar el error Prisma `P2002` y convertirlo a `DomainError`.

### 8.2. Route handler actualizado: `app/api/payments/route.ts`

- Importar `paymentCreateSchema`, `createPayment`, `withApi` y `requireRole`
- Parsear el body y pasar el resultado normalizado al service
- Construir el repositorio adaptando Prisma y ejecutando las operaciones dentro de `$transaction`
- Retornar `ok({ payment, appointment }, 201)` mediante `withApi`
- No exponer detalles de Prisma en respuestas HTTP

### 8.3. Validaciones: `lib/validations/index.ts`

Agregar `paymentCreateSchema` exportado.

---

## 9. Implementación

### 9.1. Archivos a modificar/crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/validations/index.ts` | **Modificar** | Agregar `paymentCreateSchema` |
| `lib/errors.ts` | **Modificar** | Agregar `APPOINTMENT_ALREADY_PAID` e `INVALID_APPOINTMENT_STATUS` |
| `lib/services/payment-service.ts` | **Crear** | Service layer con reglas de dominio |
| `lib/services/payment-service.test.ts` | **Crear** | Unit tests (Vitest) |
| `app/api/payments/route.ts` | **Modificar** | Usar schema + service layer |
| `prisma/schema.prisma` | **Modificar** | Agregar `Payment.notes String?` |
| `prisma/migrations/...` | **Crear** | Migración para `Payment.notes` |

### 9.2. Tests unitarios requeridos (`payment-service.test.ts`)

| Test | Descripción |
|------|-------------|
| `validatePaymentAmount` | Lanza si amount > max; pasa si amount ≤ max |
| `validatePaidAt` | Lanza si PAID sin paidAt; lanza si PENDING con paidAt; pasa en casos válidos |
| `validateAppointmentForPayment` | Lanza si cita no existe; lanza si ya tiene pago; lanza si CANCELLED/NO_SHOW |
| `createPayment` - caso feliz | Crea pago con defaults (CASH, PAID, monto completo, completeAppointment=true) |
| `createPayment` - monto parcial | Permite amountCents < priceCents |
| `createPayment` - método CARD/TRANSFER/OTHER | Persiste método correctamente |
| `createPayment` - status PENDING | Con `completeAppointment=false`, crea pago PENDING y paidAt=null sin completar cita; con `true`, rechaza |
| `createPayment` - completeAppointment=false | Crea pago PAID pero cita NO cambia a COMPLETED |
| `createPayment` - notas | Persiste notes correctamente |
| `createPayment` - cita con pago existente | Lanza `APPOINTMENT_ALREADY_PAID` |
| `createPayment` - monto inválido (> priceCents) | Lanza `VALIDATION_ERROR` |
| `createPayment` - pago parcial con complete=true | Lanza `VALIDATION_ERROR` y no modifica la cita |
| `createPayment` - cita CANCELLED/NO_SHOW | Lanza `INVALID_APPOINTMENT_STATUS` |
| `createPayment` - carrera concurrente | Una solicitud gana; la otra devuelve `APPOINTMENT_ALREADY_PAID` |

---

## 10. Validación

### 10.1. Verificación automatizada

```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm run test

# Build
npm run build
```

### 10.2. Verificación manual (checklist)

- [ ] POST `/api/payments` con solo `id` → funciona como compatibilidad heredada
- [ ] POST `/api/payments` con solo `appointmentId` → funciona con el contrato nuevo
- [ ] POST con `method: "CARD"` → persiste CARD
- [ ] POST con `amountCents: 1000` (cita de 2200) → crea anticipo y cita no completada
- [ ] POST con `status: "PENDING", completeAppointment: false` → pago PENDING, paidAt=null, cita no completada
- [ ] POST con `completeAppointment: false` → pago PAID, cita sigue en estado anterior
- [ ] POST con `notes: "Ref: 123"` → persiste notas
- [ ] POST duplicado misma cita, incluso concurrente → 409 `APPOINTMENT_ALREADY_PAID`
- [ ] POST cita CANCELLED o NO_SHOW → 409 `INVALID_APPOINTMENT_STATUS`
- [ ] POST monto > priceCents → 400 `VALIDATION_ERROR`
- [ ] Auth: sin sesión → 401; rol CLIENT o BARBER → 403

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **Backward compat** | Se acepta `id` como alias de `appointmentId`; defaults replican el pago completo en efectivo |
| **Monto parcial confuso en UI** | Documentar que es un anticipo único; v1 no registra saldo ni segundo pago |
| **PENDING + completeAppointment=true** | Validación lo prohíbe y retorna `VALIDATION_ERROR` 400 |
| **Concurrencia** | `$transaction` + `@unique` + mapeo de `P2002` a 409; la restricción de base de datos es la garantía final |
| **Schema y despliegue** | Aplicar migración antes de desplegar el código que escribe `notes`; regenerar Prisma en CI/deploy |

---

## 12. Entregables

1. **`lib/validations/index.ts`** — schema `paymentCreateSchema` exportado
2. **`lib/services/payment-service.ts`** — service layer completo con tipos e interfaz repo
3. **`prisma/schema.prisma` + migración** — campo `Payment.notes` aplicado y cliente regenerado
4. **`lib/services/payment-service.test.ts`** — ≥15 tests unitarios pasando
5. **`app/api/payments/route.ts`** — route handler refactorizado usando service + Zod
6. **Verificación** — `tsc`, `lint`, `test`, `build` en verde

---

## 13. Fuera de alcance (v1)

- Endpoint de reembolso (`POST /api/payments/:id/refund`)
- Modelo `PaymentInstallment` / pagos a plazos
- Campo `reference` / `processedBy` en schema y auditoría del operador
- Integración Stripe/MercadoPago
- UI para registrar pago (botón en lista de citas, modal)
- Reporte de pagos (`/api/reports/payments`)

Estos se abordarán en specs separados (v2, v3) tras validar esta base.

---

## 14. Criterios de aceptación

La implementación se considera completa únicamente cuando:

1. El contrato nuevo y el body heredado `id` producen el mismo resultado funcional para el pago completo en efectivo.
2. Ningún pago inválido crea `Payment` ni cambia el estado de `Appointment`.
3. La cita solo pasa a `COMPLETED` con pago `PAID` y monto completo.
4. Todos los errores usan los códigos y status HTTP definidos en este documento y el envelope estándar.
5. La migración de `notes` se aplica en una base limpia y sobre una base existente sin pérdida de datos.
6. Las pruebas cubren autenticación, autorización, validación, dominio, concurrencia, migración y respuesta HTTP.

## 15. Referencias

- `blueprint/specv1.0.md` — Spec base del proyecto
- `blueprint/CHANGELOG.md` — Historial de cambios previos
- `prisma/schema.prisma` — Modelo de datos actual
- `lib/services/appointment-service.ts` — Patrón de service layer a seguir
- `lib/validations/index.ts` — Patrones Zod existentes
- `app/api/payments/route.ts` — Endpoint actual a refactorizar