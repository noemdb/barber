# SPEC-BARBERSERVICE-BITACORA-v1.0

## Estado
- Versión: 1.0
- Proyecto: BarberService
- Stack: Next.js 16 + App Router + TypeScript + Prisma 7 + PostgreSQL + Neon + Vercel
- Status: Documento normativo único para auditoría y trazabilidad del negocio

## 1. Objetivo

BarberService requiere un registro cronológico, inmutable y trazable de la actividad del sistema para auditoría operativa, control de seguridad, historial de decisiones y soporte de operaciones. La bitácora no sustituye los logs de infraestructura ni los errores de runtime, sino que concentra la evidencia de negocio y la trazabilidad de cambios en la plataforma.

El módulo debe ser implementado como una capa de auditoría dentro del mismo ecosistema de Next.js + Prisma, con una arquitectura que priorice:

- trazabilidad de eventos de negocio y autenticación;
- privacidad de datos sensibles;
- baja latencia en la app principal;
- integridad y manejo seguro de eventos críticos;
- extensibilidad sin acoplar la bitácora a un modelo de persistencia específico.

## 2. Contexto del proyecto

Este repositorio está basado en:

- Next.js 16.2 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma ORM 7
- PostgreSQL (Neon)
- autenticación por cookie HTTP-only con JWT
- modelos de negocio centrados en barbería: User, Barber, Client, Service, Appointment, Payment, BusinessSettings

Por tanto, la bitácora debe respetar esta realidad técnica y no tomar decisiones heredadas de Laravel, Livewire o MariaDB que no correspondan a este stack.

## 3. Principios de arquitectura

### 3.1. Fuente única de escritura
Toda entrada de auditoría debe generarse a través de un único servicio central, sin escrituras directas dispersas por la app.

Regla obligatoria:
- Los call sites nunca insertan filas directamente en la tabla `binnacle_entries`.
- Todo evento pasa por un servicio central tipo `binnacle.log()` o `binnacle.logModelEvent()`.
- La construcción del payload y el enmascarado de datos sensibles ocurre en un solo punto.

### 3.2. Inmutabilidad real
La bitácora es de solo escritura. No debe permitir actualizaciones ni borrados desde la aplicación normal.

- Insert: permitido
- Update/Delete: prohibidos desde la app
- Excepción: proceso de archivado controlado, con variable de sesión/estado en la misma transacción

### 3.3. Allowlist explícita para datos auditados
La bitácora no debe guardar nunca `passwordHash`, tokens, sesiones o campos sensibles en bruto. Solo se registran campos permitidos por un allowlist explícito.

### 3.4. Severidad determina el modo de persistencia
- `CRITICAL` o `ALERT`: escritura síncrona en la misma request
- resto: escritura best-effort con `after()`/post-response cuando la app lo permita

Esto mantiene un equilibrio entre trazabilidad y rendimiento.

### 3.5. Detectar riesgos de negocio, no inventar infraestructura
La bitácora registra eventos de negocio y seguridad reportados por la app o por validaciones explícitas; no implementa un WAF ni una detección automática de ataques compleja.

## 4. Alcance funcional

### 4.1. Eventos a registrar
Se deben capturar, al menos, los siguientes tipos:

- autenticación:
  - login_success
  - login_failed
  - logout
  - session_expired
  - access_denied
- acciones del negocio:
  - appointment_created
  - appointment_updated
  - appointment_cancelled
  - appointment_completed
  - client_created
  - client_updated
  - service_created
  - service_updated
  - payment_paid
  - business_settings_updated
- acciones de administración:
  - user_created
  - user_updated
  - user_role_changed
  - barber_created
  - barber_updated
- seguridad y control:
  - forbidden_access
  - invalid_session
  - permission_denied
- errores y riesgo:
  - validation_failed
  - unexpected_error
  - external_service_error

### 4.2. Cobertura de modelos
La bitácora debe cubrir los modelos principales del proyecto:

- User
- Barber
- Client
- Service
- Appointment
- Payment
- BusinessSettings

### 4.3. Requisitos de consulta
El panel de bitácora debe permitir:

- filtro por rango de fechas
- filtro por tipo de evento
- filtro por severidad
- filtro por actor (subject)
- filtro por objeto afectado
- filtro por IP y usuario
- búsqueda por texto libre
- ordenación por fecha descendente

## 5. No objetivos

El módulo no incluye en v1.0:

- exportación automatizada a SIEM externo
- hash-chain criptográfico completo para toda la tabla
- migración a Redis para colas de auditoría
- particionado de tabla como requisito inicial
- almacenamiento de logs de infraestructura del runtime
- detección avanzada de intrusos

## 6. Modelo de datos

El modelo debe ser consistente con Prisma 7 y PostgreSQL. La estructura sugerida es:

```prisma
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
  id              String           @id @default(cuid())
  eventType       String           @map("event_type")
  category        BinnacleCategory @default(SYSTEM) @map("event_category")
  severity        BinnacleSeverity @default(INFO) @map("event_severity")

  title           String
  description     String?          @db.Text

  subjectType     String?          @map("subject_type")
  subjectId       String?          @map("subject_id")
  subjectIdentifier String?        @map("subject_identifier")

  objectType      String?          @map("object_type")
  objectId        String?          @map("object_id")
  objectIdentifier String?        @map("object_identifier")

  ipAddress       String?          @map("ip_address") @db.VarChar(45)
  userAgent       String?          @map("user_agent") @db.Text
  requestMethod   String?          @map("request_method") @db.VarChar(10)
  requestUrl      String?          @map("request_url") @db.Text
  sessionId       String?          @map("session_id") @db.VarChar(200)

  oldValues       Json?            @map("old_values")
  newValues       Json?            @map("new_values")
  changedFields   String[]         @default([]) @map("changed_fields")
  metadata        Json?

  createdBy       String?          @map("created_by")
  createdAt       DateTime         @default(now()) @map("created_at")

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

### Reglas del modelo
- `id` usa `cuid` para mantener coherencia con el resto del proyecto.
- La tabla no debe tener `updatedAt`; una entrada de bitácora no se actualiza.
- No se establecen relaciones FK con las tablas de negocio; se referencia por valor.
- Los datos de cambio se guardan en `oldValues`, `newValues`, `changedFields` y `metadata` como JSON/arrays permitidos.
- Los eventos críticos pueden incluir `entryHash` y `previousHash` más adelante, pero no como requisito obligatorio de v1.0.

## 7. Reglas de seguridad y privacidad

### 7.1. Allowlist para auditoría
Cada modelo auditable debe definir explícitamente qué campos pueden ser capturados.

Ejemplo de contrato:

```ts
export type AuditFieldSet = readonly string[];

export type AuditFieldConfig = {
  allowlist: AuditFieldSet;
  masked: AuditFieldSet;
};
```

La práctica debe ser:
- no introspección automática de modelos completos;
- no exportar `passwordHash` ni `jwt` ni `token` ni `secret`;
- enmascarar emails, teléfonos o identificadores sensibles cuando sea necesario.

### 7.2. Inmutabilidad en la base de datos
Se debe aplicar un trigger o mecanismo equivalente en PostgreSQL para impedir `UPDATE`/`DELETE` sobre `binnacle_entries` desde la capa de aplicación, exceptuando el proceso de archivado controlado.

Principio:
- `INSERT` permitido
- `UPDATE`/`DELETE` rechazados por defecto
- el archival job usa un contexto de transacción controlado, no una variable global compartida

### 7.3. Protección de trazabilidad
- El servicio debe registrar `ipAddress`, `userAgent`, `requestMethod`, `requestUrl`, `sessionId` cuando estén disponibles.
- El actor (`subject`) debe venir del usuario autenticado o de un valor de sistema, nunca de un cliente externo sin validación.
- En una operación no autenticada, `subjectType` puede ser `System` o `Anonymous`.

## 8. Arquitectura técnica

### 8.1. Componente central
Se crea un servicio `lib/binnacle.ts` o `lib/services/binnacle.ts` con la API mínima:

```ts
export type BinnacleEventInput = {
  eventType: string;
  category?: BinnacleCategory;
  severity?: BinnacleSeverity;
  title: string;
  description?: string;
  subjectType?: string;
  subjectId?: string;
  subjectIdentifier?: string;
  objectType?: string;
  objectId?: string;
  objectIdentifier?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
};

export async function logBinnacleEvent(input: BinnacleEventInput): Promise<void>;
export async function logModelMutation(...args): Promise<void>;
export async function logAuthEvent(...args): Promise<void>;
```

### 8.2. Flujo de escritura

```text
Route Handler / Server Action / Auth flow
              │
              ▼
       binnacle.log*()
              │
              ▼
   buildEntry + sanitize + allowlist
              │
              ├─ severity CRITICAL/ALERT → await prisma.binnacleEntry.create()
              │
              └─ otra severidad → after(() => prisma.binnacleEntry.create())
```

### 8.3. Lógica de registro por tipo
- eventos de negocio: se disparan desde rutas y servicios del dominio
- auth events: se disparan desde la capa de autenticación
- model mutations: se disparan desde mutaciones CRUD reales, no desde un “listener general” agresivo

### 8.4. Reglas de integración
- no crear un “observer global” que inspeccione todo sin control; esto puede producir ruido y fugas de datos
- cada evento debe ser explícito, con un `eventType` claro y una `title` legible
- la bitácora debe ser útil para operación y soporte, no solo para depuración

## 9. API y UI esperada

### 9.1. Endpoints
Se requieren endpoints de lectura en la API del dashboard, por ejemplo:

- `GET /api/binnacle` — listado paginado con filtros
- `GET /api/binnacle/:id` — detalle de evento
- `GET /api/binnacle/summary` — KPIs de actividad

### 9.2. Panel de auditoría
Ubicación sugerida: `/app/(dashboard)/settings/binnacle` o `/app/(dashboard)/dashboard/binnacle`.

Debe incluir:
- tabla principal con eventos recientes
- columnas: fecha, evento, severidad, actor, objeto, IP, descripción
- filtros laterales
- detalle de evento con `oldValues` / `newValues`
- opción de exportación CSV o JSON en una fase posterior

### 9.3. Permisos
- `OWNER` y `ADMIN` acceden a la bitácora completa
- `BARBER` puede ver solo su actividad relevante y la actividad del negocio que le corresponda
- `CLIENT` no tiene acceso a la bitácora del sistema

## 10. Requisitos de calidad

### 10.1. No se aceptan regresiones
Cada cambio que toque modelos, auth o endpoints de negocio deberá verificar:
- autenticación
- autorización
- validación de datos
- escrituras de bitácora en casos de éxito y fallo
- carga normal del dashboard

### 10.2. Pruebas mínimas requeridas
Se deben incluir pruebas unitarias/integración para:
- creación de evento crítico con persistencia síncrona
- creación de evento no crítico con escritura post-response
- enmascarado de email y campos sensibles
- bloqueo de `UPDATE`/`DELETE` a la tabla de bitácora
- trazabilidad de login exitoso/fallido
- trazabilidad de cambios de cita y pago

## 11. Fases de implementación

### Fase 1 — base productiva
- crear modelo Prisma `BinnacleEntry`
- establecer acceso estándar para escritura via servicio central
- registrar eventos críticos de login, citas y pagos
- crear endpoint de lectura paginada
- panel básico con filtros

### Fase 2 — control operativo
- integrar eventos de acceso y permisos
- revisar `oldValues`/`newValues` en actualizaciones del negocio
- asegurar enmascarado para campos sensibles
- validar performance y límites por tejido de datos

### Fase 3 — seguridad y retención
- activar protección de inmutabilidad DB-level
- definir política de retención por categoría de eventos
- crear archivado programado con limpieza controlada
- integrarlo con notificaciones relevantes para operación

### Fase 4 — madurez y integridad
- hash-chain selectivo para eventos críticos
- anclaje externo opcional para verificación de integridad
- particionado bajo demanda si el volumen crece significativamente
- dashboard de salud del módulo

## 12. Criterios de aceptación de v1.0

Se considera entregado el módulo cuando se cumplen todas estas condiciones:

1. La bitácora registra eventos de autenticación y negocio con `eventType`, `category`, `severity`, `title` y `description`.
2. Los eventos críticos se escriben de forma síncrona y persistente.
3. Los eventos no críticos se manejan sin bloquear la request principal.
4. La tabla no permite `UPDATE` ni `DELETE` desde la app.
5. Los campos sensibles se enmascaran o se excluyen explícitamente.
6. Los usuarios con rol no autorizado no pueden acceder a los datos de auditoría.
7. El dashboard muestra la línea temporal de actividad con filtros básicos.
8. Las pruebas cubren al menos login, cita, pago y control de seguridad.
9. La documentación del sistema está actualizada y no convive con specs obsoletos.

## 13. Riesgos y mitigaciones

### Riesgo: fuga de datos sensibles
Mitigación: allowlist, enmascarado y revisión de cada evento antes de cierre de v1.0.

### Riesgo: latencia en la app
Mitigación: priorizar `CRITICAL`/`ALERT` síncronos y usar `after()` para el resto.

### Riesgo: manipulación de registros
Mitigación: inmutabilidad por trigger/DB-level y arquitectura de solo escritura.

### Riesgo: ruido de eventos
Mitigación: todos los eventos deben pasar por un esquema explícito con `eventType` y `title` comprensibles.

## 14. Decisión final para este proyecto

Para BarberService, la bitácora debe implementarse como un módulo de auditoría de negocio dentro de la arquitectura actual de Next.js/Prisma, con un diseño orientado a seguridad, trazabilidad y observabilidad operativa. No se lleva la lógica heredada de SAEFL ni de Laravel; la implementación debe ser nativa del stack real del repositorio.

Este documento es el único spec normativo del módulo en v1.0 y reemplaza todo el material anterior obsoleto de la carpeta de bitácora.
