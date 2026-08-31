# SPEC-BINNACLE-001: Sistema de Bitácora de Auditoría (BarberService)

| | |
|---|---|
| **Estado** | Draft — listo para implementación Fase 1 |
| **Stack** | Next.js 16.2 (App Router) · React 19.2 · TypeScript 5.9 · Tailwind CSS 4 · Prisma 7 (PostgreSQL/Neon) · Vercel |
| **Autor** | — |
| **Revisores** | — |
| **Módulos relacionados** | Auth/JWT (cookie `barberservice_session`), Citas, Clientes, Barberos, Servicios, Pagos, Configuración |

> **Nota de vigencia**: este documento es el spec normativo del módulo Binnacle para **BarberService** y sustituye a `binnacle-module.md` (spec original, redactado para SAEFL/Laravel) y `binnacle-module-fase1-revisado.md` (revisión técnica), que quedan obsoletos como referencia de implementación. La portabilidad Laravel→Next.js se documenta en el Anexo C.

---

## 1. Resumen ejecutivo

BarberService necesita un registro cronológico e inmutable de actividad de usuarios, eventos de negocio y eventos de seguridad, con fines de auditoría operativa, histórico de citas, y trazabilidad de cambios (p. ej. quién cambió una cita o el precio de un servicio). Este documento especifica el modelo de datos, la arquitectura de escritura/lectura, el control de acceso según rol y un plan de implementación en fases, con criterios de aceptación verificables por fase.

**No-objetivos explícitos** (para evitar scope creep durante implementación):
- Este módulo **no** es un WAF ni un sistema de detección de intrusos. Eventos de seguridad como `sql_injection_detected` solo se registran si un componente externo los reporta; este spec no implementa detección.
- No sustituye los logs de la plataforma (Vercel functions / `console`) ni logs de Neon — es un registro de **negocio/auditoría**, no de **debugging de bajo nivel**.
- No incluye SIEM externo ni exportación automatizada en Fase 1-2 (ver Fase 3, marcado opcional).

---

## 2. Contexto y decisiones de arquitectura (ADRs)

### ADR-001: Un único camino de escritura (evento/helper central)

**Contexto**: la escritura puede dispararse desde Route Handlers, búsquedas de datos sensibles y el flujo de autenticación. Sin un único punto de entrada, se corre el riesgo de lógica duplicada y de fugas de datos (cada call site decidiendo por su cuenta qué persistir).

**Decisión**: todo punto de captura (helper de modelo, envoltura de auth, middleware/adapter de semilla) llama a `binnacle.log()`, que **únicamente** escribe una entrada a través de un único helper `createEntry()`. Nunca hay un segundo camino de escritura directa.

**Consecuencias**: toda la lógica de sanitización/enmascarado/allowlist vive en un solo lugar (`buildEntry()`), lo que la hace auditable y testeable de forma centralizada.

### ADR-002: Severidad determina síncrono vs. asíncrono, no el tipo de evento

**Contexto**: se necesita baja latencia percibida en la request (no bloquear al usuario) pero también garantía de que eventos críticos no se pierdan. En Vercel/serverless **no existe un worker de cola persistente**; la única herramienta post-respuesta es `after()` de `next/server` (ya usada en el proyecto para notificaciones de Telegram).

**Decisión**: el helper escribe de forma **síncrona** cuando `severity IN (critical, alert)` (misma request, garantía de persistencia); para el resto usa `after()` (best-effort, se registra tras responder). El volumen de una barbería es bajo (decenas de escrituras/día), por lo que el coste síncrono es despreciable; la vía `after()` es la opción por defecto para "no bloquear" sin infraestructura extra. `after()` **no es durable** (puede morir con la función), así que los eventos críticos **siempre** son síncronos por ADR —ver §2.6.

### ADR-003: Hash-chain de integridad pospuesto y acotado

**Contexto**: un "blockchain ligero" (hash de cada fila depende de la anterior) requiere secuencialidad estricta. Esto es incompatible con escritura paralela, y un chain completo sobre el volumen total de eventos `info`/`debug` es sobre-ingeniería para el riesgo real que mitiga.

**Decisión**: el hash-chain se implementa en **Fase 3/4**, y **solo** aplica a filas con `severity IN (critical, alert)` — que ya se escriben en modo síncrono por ADR-002. Se documenta explícitamente como mitigación parcial: un atacante con acceso de escritura a la BD puede recalcular la cadena hacia adelante desde el punto de compromiso. Si se requiere garantía criptográfica real, la clave de firma debe vivir fuera de la BD (ver §8.3).

### ADR-004: Inmutabilidad en dos capas, no solo autorización de aplicación

**Contexto**: "no editable por usuarios normales" a nivel de código no protege contra queries directas (SQL crudo), acceso administrativo a la BD, o un bug futuro que use el cliente Prisma fuera del flujo previsto.

**Decisión**: además de no exponer mutaciones en el módulo de UI, se agrega un **trigger `BEFORE UPDATE`/`BEFORE DELETE` en PostgreSQL** (vía migración raw, §4.1) que rechaza la operación salvo que una variable de sesión (`app.binnacle_archive_process`) esté activa, seteada únicamente por el proceso de archivado (Fase 3/4). Como Prisma usa conexiones de pool, la variable de sesión debe fijarse y limpiarse en la **misma transacción/conexión** del job de archivado.

### ADR-005: Atributos auditables por allowlist explícita, nunca introspección cruda

**Contexto**: volcar todo el record hacia la bitácora captura cualquier campo del modelo, incluyendo `passwordHash` — un problema real de privacidad/seguridad, no hipotético.

**Decisión**: los modelos auditables implementan el tipo `Auditable` con `auditableAttributes()` (allowlist) y `maskedAuditFields()` (campos a enmascarar). `binnacle.createEntry()` es el único punto que lee estos métodos; ningún call site accede a atributos del modelo directamente.

### ADR-006: `id` String cuid y sin FKs hacia la bitácora

**Contexto**: los IDs en BarberService son `cuid` (`String`), no autogenerados numéricos.

**Decisión**: `subject_id`/`object_id` son `String?` y guardan el `cuid` del registro. La bitácora **no** declara relaciones ni FKs con las tablas de negocio; solo referencia por valor. Esto evita que un borrado en cascada o un `onDelete` afecte a una bitácora que debe conservar el historial, y permite incluso que la tabla viva en otra base si se escala (p. ej. neon-schema separado).

---

## 3. Objetivos y alcance

- Registrar acciones de usuarios autenticados (`ADMIN`/`OWNER`/`BARBER`) y no autenticados (`CLIENT`, reservas públicas)
- Mantener un historial inmutable y cronológico de eventos
- Informes de actividad por usuario, rol y rango de tiempo
- Visualización de línea de tiempo / feed de eventos
- Integridad y protección contra manipulación de registros (ver ADR-003/004)
- Optimizar rendimiento para minimizar impacto en la aplicación principal
- Cumplir con requisitos de auditoría y trazabilidad de negocio

**Cobertura**: transacciones CRUD en modelos críticos (User, Client, Service, Barber, Appointment, Payment, BusinessSettings), autenticación (login/logout/fallos), accesos a rutas administrativas, excepciones no manejadas (opcional, ver §5.6) y eventos de seguridad (solo si son reportados por un componente externo — ver No-objetivos).

---

## 4. Modelo de datos

```prisma
// schema.prisma (extracto — se añade al esquema existente)

enum BinnacleCategory {
  AUTHENTICATION
  USER_ACTION
  SYSTEM
  SECURITY
  ERROR
}

enum BinnacleSeverity {
  DEBUG
  INFO
  WARNING
  CRITICAL
  ALERT
}

model BinnacleEntry {
  id            String            @id @default(cuid())
  eventType     String            @map("event_type")           // user_login, model_updated, ...
  category      BinnacleCategory  @default(SYSTEM)             @map("event_category")
  severity      BinnacleSeverity  @default(INFO)               @map("event_severity")

  title         String
  description   String?          @db.Text

  // Sujeto (quién realizó la acción)
  subjectType       String?       @map("subject_type")        // "User" | "System" | "Client"
  subjectId         String?       @map("subject_id")
  subjectIdentifier String?       @map("subject_identifier")  // email/name del actor

  // Objeto (sobre qué se realizó la acción)
  objectType       String?        @map("object_type")          // "Appointment" | "Payment" | ...
  objectId         String?        @map("object_id")
  objectIdentifier String?        @map("object_identifier")    // representación legible

  // Contexto de request
  ipAddress   String?  @map("ip_address")   @db.VarChar(45)
  userAgent   String?  @map("user_agent")   @db.Text
  requestMethod String? @map("request_method") @db.VarChar(10)
  requestUrl  String?  @map("request_url")  @db.Text
  sessionId   String?  @map("session_id")   @db.VarChar(200)

  // Diferencias de negocio
  oldValues     Json?  @map("old_values")
  newValues     Json?  @map("new_values")
  changedFields String[] @default([]) @map("changed_fields")
  metadata      Json?

  // Fase 3/4, nullable (ADR-003)
  entryHash    String? @map("entry_hash")    @db.Char(64)
  previousHash String? @map("previous_hash") @db.Char(64)

  createdBy String? @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([eventType])
  @@index([category])
  @@index([severity])
  @@index([subjectType, subjectId, createdAt])
  @@index([objectType, objectId, createdAt])
  @@index([createdAt])
  @@index([ipAddress])
  @@map("binnacle_entries")
}
```

> **Notas de modelado**:
> - `id` es cuid (consistente con el resto de modelos); no hay `updatedAt` — una fila de bitácora nunca se actualiza, por diseño (ADR-004).
> - Los enums Prisma mapean a enums nativos de PostgreSQL. `changed_fields` usa `String[]` (array) en vez de JSON, por simplicidad de consulta; `old_values`/`new_values`/`metadata` son `Json`.
> - Al migrar el esquema actual de `binnacle_entries` (ANEXO C) usa `prisma migrate` + `--create-only` para revisar el SQL generado antes de aplicar.

### 4.1 Trigger de inmutabilidad (PostgreSQL)

```sql
-- migration: <timestamp>_binnacle_immutability.sql (raw SQL en migrations/)
CREATE OR REPLACE FUNCTION binnacle_block_mutation() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.binnacle_archive_process', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'binnacle_entries es de solo escritura';
  END IF;
  RETURN NULL; -- no proceder (BEFORE UPDATE/DELETE)
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_binnacle_no_update
BEFORE UPDATE ON binnacle_entries
FOR EACH ROW EXECUTE FUNCTION binnacle_block_mutation();

CREATE TRIGGER trg_binnacle_no_delete
BEFORE DELETE ON binnacle_entries
FOR EACH ROW EXECUTE FUNCTION binnacle_block_mutation();
```

El proceso de archivado (Fase 3/4) ejecuta `set_config('app.binnacle_archive_process', '1', true)` en la **misma transacción** y lo limpia al final (la opción `is_local = true` (tercer arg) hace que se limpie automáticamente al cerrar la transacción). Ningún código de aplicación normal setea esa variable, así que un `update`/`delete` accidental o malicioso sigue bloqueado.

> ⚠️ **Pool de conexiones**: Neon/PgBouncer puede reutilizar conexiones entre requests. Por eso el flag debe ser **por transacción** (`is_local=true`) y aplicar solo en el job de archivado; nunca dejar el flag activo en una conexión compartida.

### 4.2 Tabla de archivado (Fase 3)

```sql
CREATE TABLE binnacle_entries_archive (LIKE binnacle_entries INCLUDING ALL);
ALTER TABLE binnacle_entries_archive ADD COLUMN archived_at timestamptz DEFAULT now();
CREATE INDEX idx_archived_at ON binnacle_entries_archive (archived_at);
```

Un job programado (Vercel Cron o función on-demand, Anexo C) mueve filas fuera de la ventana de retención activa (§12) a esta tabla, dentro de una transacción con el flag de archivado (§4.1).

---

## 5. Arquitectura de componentes

```
Route Handler / auth / helper de modelo
            │
            ▼
    binnacle.log() / logModelEvent() / logAuthEvent()
            │  (allowlist + enmascarado vía Auditable, ADR-005)
            ▼
    buildEntry() → createEntry()
        ├── severidad crítica/alert → síncrona (await)
        └── resto → after(() => createEntry(...))  (best-effort post-respuesta)
            │
            ▼
    prisma.binnacleEntry.create()  [INSERT-only, protegido por triggers]
```

### 5.1 Tipo `Auditable`

```ts
// lib/binnacle/auditable.ts
export interface Auditable {
  /** Allowlist de campos permitidos en old_values/new_values. */
  auditableAttributes(): (keyof typeof this & string)[];
  /** Subconjunto de auditableAttributes() que debe enmascararse. */
  maskedAuditFields(): string[];
}
```

```ts
// app/generated/prisma/client no es editable; el helper aplica la allowlist
// por un mapa explícito de modelo → campos (ver §5.2), no por introspección.
```

> **Nota de modelo real**: como Prisma genera tipados que no permiten añadir métodos arbitrarios, la allowlist se declara en un registro central `AUDITABLE_SCHEMA` (constante tipada por modelo) en lugar de un método de instancia. Esto conserva la propiedad del ADR-005 (nada se audita por introspección cruda) de forma idiomática en TS.

### 5.2 Servicio `binnacle`

```ts
// lib/binnacle/index.ts (pseudocódigo de referencia)
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { getSession } from "@/lib/auth";

type Entry = Prisma.BinnacleEntryUncheckedCreateInput;

const CRITICAL: BinnacleSeverity[] = ["CRITICAL", "ALERT"];

export function log(eventType: string, context: Partial<Entry> = {}) {
  const entry = buildEntry(eventType, context);
  if (CRITICAL.includes(entry.severity)) {
    // síncrono: garantía de persistencia (ADR-002)
    return write(entry);
  }
  // best-effort post-respuesta
  after(() => write(entry));
  return;
}

export function logModelEvent<K extends keyof AUDITABLE_SCHEMA>(
  model: K, action: "created" | "updated" | "deleted", record: AuditableRecord,
  context: Partial<Entry> = {},
) {
  const { oldValues, newValues, changedFields } = extractDiff(model, record);
  return log(`${model}_${action}`, {
    ...context,
    object_type: model,
    object_id: record.id,
    old_values: oldValues,
    new_values: newValues,
    changed_fields: changedFields,
  });
}

export function logAuthEvent(event: string, context: Partial<Entry> = {}) {
  return log(event, { ...context, category: "AUTHENTICATION" });
}

async function write(entry: Entry) {
  await prisma.binnacleEntry.create({ data: entry });
}

function systemSubject() { return { subject_type: "System", subject_id: null, subject_identifier: "system" }; }

/** Único punto que lee la allowlist y aplica el enmascarado (ADR-005). */
function extractDiff(model: string, record: AuditableRecord) {
  const allowed = AUDITABLE_SCHEMA[model]?.attributes ?? [];
  const masked = AUDITABLE_SCHEMA[model]?.masked ?? [];
  const old = pick(record.oldValues ?? {}, allowed);
  const fresh = pick(record.values, allowed);
  for (const f of masked) maskField(old, f), maskField(fresh, f);
  const changed = pick(record.dirty ?? [], allowed);
  return { oldValues: old, newValues: fresh, changedFields: changed };
}
```

### 5.3 Registro `AUDITABLE_SCHEMA` (allowlist por modelo)

```ts
// lib/binnacle/auditable-schema.ts
export const AUDITABLE_SCHEMA = {
  User: {
    attributes: ["id", "name", "email", "role", "active"],
    masked: ["email"],
  },
  Client: {
    attributes: ["id", "name", "phone", "email", "notes", "active"],
    masked: ["email", "phone"],
  },
  Service: {
    attributes: ["id", "name", "description", "durationMin", "priceCents", "active"],
    masked: [],
  },
  Barber: {
    attributes: ["id", "name", "phone", "email", "specialty", "active"],
    masked: ["email", "phone"],
  },
  Appointment: {
    attributes: ["id", "startsAt", "endsAt", "status", "notes", "priceCents", "clientId", "barberId", "serviceId"],
    masked: ["notes"],
  },
  Payment: {
    attributes: ["id", "appointmentId", "amountCents", "method", "status", "paidAt"],
    masked: [],
  },
  BusinessSettings: {
    attributes: ["businessName", "logoUrl", "faviconUrl", "tagline", "heroImageUrl", "description", "phone", "email", "whatsapp", "address", "mapsUrl", "instagramUrl", "facebookUrl", "currency", "timezone", "appointmentSlot", "telegramChatId"],
    masked: ["email", "phone", "whatsapp", "telegramChatId"],
  },
} as const;
```

> **Regla**: `passwordHash` y cualquier secreto/token **jamás** figuran en la allowlist ni en `metadata`. El enmascarado es irreversible (no es cifrado, es pérdida de información intencional).

### 5.4 Captura de contexto de request

La IP, user-agent, método y URL se extraen en el call site (donde hay `Request`) y se pasan en `context`. `sessionId`/`subject` se derivan del JWT de sesión (`getSession()`). En `after()` el context debe haberse capturado **antes** de responder, porque tras la respuesta el `Request` original puede no estar disponible.

```ts
export function requestContext(request: Request): Partial<Entry> {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent"),
    requestMethod: request.method,
    requestUrl: request.url,
  };
}
```

### 5.5 Observer de referencia (capa de servicio, no Prisma hooks)

En Next.js no hay observers de ORM comparables a Eloquent. Se captura en el **Route Handler / servicio de dominio** en el punto donde ya se conoce la intención y el actor:

```ts
// app/api/appointments/[id]/route.ts (PATCH — cambio de estado)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN", "OWNER", "BARBER");
    const body = statusUpdateSchema.parse(await request.json().catch(() => null));

    const before = await prisma.appointment.findUnique({ where: { id: params.id } });
    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: body.status },
    });

    await logModelEvent("Appointment", "updated", diff(before, appointment), {
      ...requestContext(request),
      session,
      title: "Cita actualizada",
      severity: statusCritical(body.status) ? "WARNING" : "INFO",
    });

    return { data: appointment };
  });
}
```

> A diferencia de Laravel, **no** se usan hooks globales de Prisma (`$use`/middleware) para evitar auditar de forma involuntaria consultas internas y para no acoplar el prompt a cada escritura. El alcance de auditado se declara explícitamente en cada handler (equivalente a la decisión §9.2 del spec original: volumen acotado y sin sorpresas).

### 5.6 Manejo de errores no manejados (opcional, Fase 2)

Se engancha en `error.tsx` global o en el wrapper `withApi` para registrar excepciones 500 con `severity = CRITICAL` (y 4xx no manejados con `WARNING`), evitando duplicar ruido de validaciones que ya tienen su flujo UX.

### 5.7 Cobertura por rutas (Fase 2)

Se registran accesos a rutas administrativas sensibles (p. ej. `settings`, `payments`, `barbers`) con `category = SECURITY` y `eventType = access` (solo para roles staff); las reservas públicas del booking con `system`. Esto replica el middleware `TrackBinnacleAccess` del spec original pero de forma selectiva por página/Route Handler, no global (para no registrar cada request del sitio público sin valor de auditoría).

---

## 6. Matriz RBAC

| Rol | Ver panel completo (`/binnacle`) | Ver timeline de cualquier usuario | Ver su propia actividad | Exportar | Configurar retención |
|---|:---:|:---:|:---:|:---:|:---:|
| `OWNER` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `BARBER` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `CLIENT` | ❌ | ❌ | ✅ (solo su historial) | ❌ | ❌ |

**Implementación**: se reutilizan `requireRole()`/`requireStaff()` de `lib/permissions.ts`. "Ver su propia actividad" → ruta autorizada con `session.sub` como `subject_id` (modo `self`), quedando bloqueada la consulta a otro usuario. La meta-auditoría (registrar quién consulta la bitácora) queda como evento opcional `binnacle_accessed` con `category = SECURITY`.

---

## 7. Taxonomía de eventos

Se mantiene el catálogo completo del documento original, adaptado a BarberService:

```
authentication:
  - user_login
  - user_login_failed
  - user_logout
  - password_changed

user_action (sobre modelos de negocio):
  - user_created / user_updated / user_deleted
  - client_created / client_updated / client_deleted
  - service_created / service_updated / service_deleted
  - barber_created / barber_updated / barber_deleted
  - appointment_created / appointment_updated / appointment_deleted
  - appointment_status_changed
  - payment_created / payment_refunded
  - settings_updated
  - booking_created   (reserva pública del booking, sin sesión)

system:
  - backup_created       (solo si existe export, Anexo opcional)
  - config_updated
  - binnacle_archive_run
  - binnacle_anchor_sent (Fase 3/4)

security:
  - access_denied
  - privilege_escalation_attempt
  - binnacle_accessed
  - brute_force_detected     ⚠️ requiere reporter externo, no autogenerado
  - sql_injection_detected   ⚠️ requiere reporter externo, no autogenerado
  - xss_attempt_detected     ⚠️ requiere reporter externo, no autogenerado

error:
  - exception_thrown
  - validation_error
  - external_service_failed  (ej. fallo de Telegram)
```

**Eventos que requieren integración externa** (no se autogeneran en este spec): `brute_force_detected`, `sql_injection_detected`, `xss_attempt_detected`.

---

## 8. Seguridad

### 8.1 Privacidad de datos
- Nunca se persisten `passwordHash`, tokens, ni secretos — garantizado estructuralmente por la allowlist `AUDITABLE_SCHEMA` (ADR-005), no por convención.
- Campos marcados en `masked` se enmascaran antes de persistir (irreversible).

### 8.2 Control de acceso
Ver matriz RBAC (§6). Reutiliza `requireRole`/`requireStaff` existentes.

### 8.3 Integridad
Ver ADR-003/004. **Ancla externa (Fase 3/4)**: un job publica el hash de la última entrada `critical`/`alert` a un destino fuera de la BD (p. ej. un log en el proveedor / objeto / webhook a Telegram) con verificación `verifyAnchorIntegrity()`. Mitiga la limitación del hash-chain (manipulación por un actor con acceso a la BD que recalcule la cadena).

---

## 9. Rendimiento y capacity planning

Antes de Fase 1, completar:

| Dato requerido | Cómo obtenerlo |
|---|---|
| Usuarios staff activos/día | Query sobre la tabla `User` con rol ≠ CLIENT |
| Operaciones CRUD/día en modelos auditables | Conteo de `updatedAt` en ventana de 7 días por tabla |
| Tamaño estimado de fila (`old_values`+`new_values`) | Prototipo con 100 filas reales |

Con esos tres números se calcula el crecimiento mensual esperado y se decide si aplicar particionado (§9.1) o si basta la retención+archivado.

### 9.1 Estrategias
- Índices ya cubiertos en §4. **Particionado en Fase 4, a demanda**: un job semanal proyecta el crecimiento y recomienda particionar cuando supera el umbral (procedimiento adaptado en `particionado-procedimiento.md`, Anexo C).
- Archivado (§4.2): primera línea de control de tamaño.
- Paginación 100-500/página; selección de columnas por vista.

### 9.2 `model_viewed`
Restringido explícitamente a una allowlist de páginas/modelos definida en configuración; sin esta restricción el volumen puede superar al resto de la tabla combinado. En BarberService se omite por defecto (no hay vistas de detalle con valor de auditoría suficientes para justificar el volumen); se deja documentado como extensión opcional.

---

## 10. Interfaz de usuario

Panel `/binnacle` (App Router, rutas del dashboard) con filtros (rango de fechas, tipo de evento, categoría, severidad, actor, texto libre), tabla principal con paginación, y detalle con `old_values`/`new_values`, `changed_fields` y JSON de `metadata`. Timeline en un componente cliente con datos estructurados (`event_type`, `title`, `icon_key`) — **sin** embeker HTML (antipatrón del ejemplo original) para no acoplar datos a presentación y cerrar vectores de XSS.

---

## 11. Plan de implementación por fases

### Fase 1 — Base y eventos críticos
- [ ] Migración Prisma: modelo `BinnacleEntry` + enums + índices (§4)
- [ ] Migración raw: triggers de inmutabilidad (§4.1)
- [ ] `lib/binnacle/index.ts` (log, logModelEvent, logAuthEvent, createEntry) + `AUDITABLE_SCHEMA`
- [ ] Captura en auth (login/logout/fallo) y en CRUD de User/Client/Service/Barber/Appointment/Payment/Settings
- [ ] Panel básico `/binnacle` (tabla + filtros simples)

**Criterios de aceptación Fase 1**:
1. Crear/actualizar/eliminar una cita genera una entrada con `old_values`/`new_values` correctos y **sin** `passwordHash` (verificado por test, no inspección manual).
2. Un `update`/`delete` directo a `binnacle_entries` falla con el error del trigger.
3. Un login fallido genera una entrada `severity=warning` visible en `/binnacle` en < 2s.
4. Un usuario `BARBER`/`CLIENT` no puede acceder al panel de auditoría completa (403).

### Fase 2 — Cobertura completa
- [ ] Accesos a rutas administrativas (settings, payments, barbers) con `category=security`
- [ ] Refinamiento de filtros + búsqueda de texto libre + paginación
- [ ] Endpoint de timeline (`app/api/binnacle/...`, `auth` vía cookie)
- [ ] Manejo de errores 500 vía wrapper `withApi`

### Fase 3 — Visualización y reportes
- [ ] Timeline/feed de actividad por usuario (componente cliente)
- [ ] Dashboard de métricas (totales, distribución por categoría/severidad, actores top)
- [ ] Exportación CSV/PDF
- [ ] Tabla + job de archivado (§4.2)
- [ ] Ancla externa del hash-chain (§8.3)

### Fase 4 — Optimización y seguridad avanzada
- [ ] Hash-chain para eventos `critical`/`alert` (ADR-003)
- [ ] Particionado a demanda (§9.1)
- [ ] Meta-auditoría (`binnacle_accessed`)
- [ ] Pruebas de carga y benchmarks

---

## 12. Políticas de retención

| Categoría | Retención |
|---|---|
| Eventos críticos (security, errores críticos) | 2 años |
| Eventos de usuario estándar | 1 año |
| Eventos de sistema de rutina | 6 meses |
| Logs de depuración (solo dev) | 1 mes |

Después del período: archivado a `binnacle_entries_archive` (§4.2) o eliminación según política del negocio, ejecutado exclusivamente por el job con el flag de archivado. Para validar la política sin efectos: `--dry-run` (muestra filas por categoría sin mover nada). Definir el racional legal/operativo (p. ej. retención de historial de citas/pagos) antes de Fase 3.

---

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| Impacto en performance | Escritura no crítica vía `after()` (ADR-002), índices consolidados (§4), volumen bajo por barbería |
| Crecimiento descontrolado de BD | Retención + archivado automático + scope explícito por handler (§5.5) |
| Complejidad de implementación | Fases incrementales, Fase 1 acotada a los modelos del README |
| Falsa sensación de integridad por el hash-chain | Documentado en ADR-003 como mitigación parcial, no absoluta |
| Pérdida de eventos no críticos por `after()` | No durable en serverless; mitigado porque los eventos críticos van síncronos y el volumen es acotado. Si se requiere durability, escribir síncrono (coste despreciable). |

---

## 14. Métricas de éxito

- % de acciones críticas registradas: >99.9%
- Tiempo promedio de escritura: síncrono < 50 ms (critical) / vía `after()` sin impacto percibido
- Tiempo de consulta de timeline: < 2 s para el último mes
- Cero entradas modificadas o eliminadas fuera del proceso de archivado (verificable por ausencia de filas con `entry_hash` roto, Fase 4)

---

## Anexo A — Tipo de eventos por categoría de negocio

| Categoría | Modelo | Eventos |
|---|---|---|
| Clientes | `Client` | client_created / updated / deleted |
| Servicios | `Service` | service_created / updated / deleted |
| Barberos | `Barber` | barber_created / updated / deleted |
| Citas | `Appointment` | appointment_created / updated / deleted / status_changed |
| Pagos | `Payment` | payment_created / payment_refunded |
| Configuración | `BusinessSettings` | settings_updated |
| Cuentas | `User` | user_created / updated / deleted |
| Autenticación | — | user_login / user_login_failed / user_logout / password_changed |
| Reservas públicas | `Appointment` | booking_created (sin sesión, actor `System`/`Client`) |

## Anexo B — Diagrama de flujo

```
[Route Handler] ──(captura Request ctx + sesión)──► binnacle.log / logModelEvent
                                                          │
                                                    buildEntry (allowlist + mask)
                                                          │
                    ┌─────────────────────────────────────┴─────────────────────────┐
              severity CRITICAL/ALERT                                         resto
                    │ síncrono (await)                                          │ after()
                    ▼                                                            ▼
        prisma.binnacleEntry.create()  ◄──────── triggers de inmutabilidad (POSTGRES)
                    │
                    ▼
          Panel /binnacle + timeline + export
```

## Anexo C — Portabilidad Laravel → BarberService

| Concepto SAEFL/Laravel | Equivalente BarberService |
|---|---|
| Laravel 10 + Livewire | Next.js 16.2 (App Router) + componentes React |
| Eloquent Observers | Captura en Route Handlers / servicios de dominio (§5.5) |
| `Binnacle::log()` | `lib/binnacle` (log/logModelEvent/logAuthEvent) |
| Contrato `Auditable` interface | Registro tipado `AUDITABLE_SCHEMA` (§5.3) |
| Colas `queue:work --queue=binnacle` | `after()` de `next/server` + escritura síncrona para críticos |
| MariaDB trigger | PostgreSQL trigger raw (§4.1) |
| `QUEUE_CONNECTION=database` | No aplica (serverless) — Vercel Cron / función on-demand para jobs (§4.2) |
| Roles is_director/is_leadership/is_coordinacion/profesor/estudiante | `OWNER`/`ADMIN`/`BARBER`/`CLIENT` |
| `/admin/binnacle` (Livewire) | `/binnacle` (App Router) |
| Panel del profesor "Mi Bitácora" | Sección "Mi actividad" por rol (§6, modo `self`) |

> Los documentos `guia-produccion-worker-schedule.md`, `mejoras-propuestas.md` y `particionado-procedimiento.md` son específicos de Laravel/SAEFL (workers, supervisor, Livewire). Su funcionalidad equivalente se recoge en el Anexo C de este spec; no aplican tal cual a BarberService.
