# Spec: Relación N:M entre `Barber` y `Service`

## 1. Objetivo y alcance

Implementar una relación muchos-a-muchos entre los modelos Prisma `Barber` y `Service` mediante una entidad pivote explícita. Un barbero puede ofrecer varios servicios y un servicio puede ser ofrecido por varios barberos.

La relación debe aplicarse en cuatro lugares:

1. Modelo y migración Prisma.
2. CRUD administrativo de barberos y servicios.
3. Flujo público de reserva y validación server-side.
4. Seed y pruebas.

### Estado actual verificado

- Base de datos PostgreSQL gestionada por Prisma 7.
- Los IDs son `String` con `cuid()`, no enteros.
- Las tablas reales usan nombres Prisma: `"Barber"`, `"Service"` y `"Appointment"`.
- `Appointment` ya relaciona directamente un `barberId` con un `serviceId`.
- No existe una FK `serviceId` en `Barber`, ni `barberId` en `Service`.
- No existe una relación N:M previa ni una tabla `barber_services`.
- El acceso actual se hace principalmente desde rutas API y consultas Prisma directas; no hay repositorio dedicado para estas entidades.
- El landing carga ambos catálogos desde `app/page.tsx` y el wizard vive en `components/landing/use-booking-wizard.ts` y `components/landing/booking-dialog.tsx`.

### Fuera de alcance

- No cambiar la relación de `Appointment`: una cita sigue teniendo un solo barbero y un solo servicio.
- No migrar ni eliminar columnas antiguas: no existen columnas heredadas que representen esta relación.
- No convertir los IDs a `Int` ni renombrar las tablas existentes.

## 2. Modelo Prisma

Agregar las colecciones de la relación:

```prisma
model Barber {
  // campos actuales sin cambios
  services     BarberService[]
  appointments Appointment[]
}

model Service {
  // campos actuales sin cambios
  barbers      BarberService[]
  appointments Appointment[]
}

model BarberService {
  barberId  String
  serviceId String
  barber    Barber  @relation(fields: [barberId], references: [id], onDelete: Cascade)
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([barberId, serviceId])
  @@index([serviceId])
  @@map("barber_services")
}
```

Notas:

- `@@id([barberId, serviceId])` impide duplicados y crea el índice que empieza por `barberId`.
- `@@index([serviceId])` permite consultar eficientemente la dirección inversa.
- Los nombres de las columnas serán `barberId` y `serviceId`, siguiendo el estilo actual de Prisma. Solo el nombre físico de la tabla será `barber_services` mediante `@@map`.
- No usar una relación implícita de Prisma: el modelo pivote explícito permite una migración y consultas estables con la tabla existente.

## 3. Migración

Crear la migración con el flujo del proyecto:

```bash
npm run db:migrate -- --name add_barber_service_relation
npm run db:generate
```

La migración generada debe ser equivalente a:

```sql
CREATE TABLE "barber_services" (
  "barberId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barberId", "serviceId"),
  CONSTRAINT "barber_services_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "barber_services_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "barber_services_serviceId_idx"
  ON "barber_services"("serviceId");
```

No debe contener `DROP COLUMN`, `ALTER TABLE barbers` ni inserciones de migración: el esquema actual no tiene una relación 1:N que preservar.

Nota sobre `ON UPDATE CASCADE`: Prisma genera automáticamente `ON UPDATE CASCADE`
para las FKs de Postgres aunque solo se declare `onDelete: Cascade` en el schema.
No es necesario configurarlo de forma explícita; el SQL de arriba lo muestra solo
como referencia del resultado final.

## 4. Contrato de datos y operaciones

### 4.1. Consultas Prisma esperadas

Usar `prisma.barberService` dentro de las rutas o de una nueva función de servicio compartida. Las operaciones mínimas son:

```ts
prisma.service.findMany({
  where: { active: true, barbers: { some: { barberId } } },
});

prisma.barber.findMany({
  where: { active: true, services: { some: { serviceId } } },
});
```

Para reemplazar asociaciones, usar una transacción:

```ts
await prisma.$transaction(async (tx) => {
  await tx.barberService.deleteMany({ where: { barberId } });
  await tx.barberService.createMany({
    data: [...new Set(serviceIds)].map((serviceId) => ({ barberId, serviceId })),
  });
});
```

Antes de reemplazar, normalizar `serviceIds` con `new Set(...)` para eliminar
duplicados de forma determinista. No confiar en `skipDuplicates`: aunque protege
contra la PK compuesta, en un reemplazo completo puede enmascarar entradas
duplicadas del input. La misma operación debe existir en dirección inversa para
`barberIds`. Antes de insertar, validar que todos los IDs existan y estén
activos; si alguno es inválido, abortar la transacción completa (rollback del
`create`/`update` incluido). Para el catálogo público solo deben devolverse
entidades con `active: true`.

### 4.2. Helpers compartidos

Crear funciones reutilizables para evitar que las rutas de barberos y servicios
implementen transacciones ligeramente distintas:

- `replaceBarberServices(tx, barberId, serviceIds)`;
- `replaceServiceBarbers(tx, serviceId, barberIds)`;
- `getActiveServicesByBarberId(barberId)`;
- `getActiveBarbersByServiceId(serviceId)`.

Los helpers deben recibir el cliente Prisma transaccional cuando formen parte
de un `create` o `update`. Deben comprobar que todos los IDs enviados existen y
están activos antes de reemplazar asociaciones; si alguno es inválido, abortar
la transacción completa.

### 4.3. Schemas de validación

Extender los schemas existentes en `lib/validations/index.ts`:

```ts
const relationIds = z
  .array(z.string().cuid())
  .superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No se permiten IDs duplicados" });
    }
  })
  .default([]);

// barberCreateSchema / barberPatchSchema
serviceIds: relationIds,

// serviceCreateSchema / servicePatchSchema
barberIds: relationIds,
```

En `PATCH`, distinguir entre campo omitido y lista vacía:

- omitido: conservar asociaciones actuales;
- `[]`: eliminar todas las asociaciones;
- lista no vacía: reemplazar el conjunto completo.

Normalizar IDs repetidos con `new Set(...)` antes de `createMany`; la clave
compuesta es la protección final contra duplicados, pero no debe usarse como
única defensa. Validar duplicados en el schema para fallar temprano y de forma
testeable:

```ts
const relationIds = z
  .array(z.string().cuid())
  .superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se permiten IDs duplicados",
      });
    }
  })
  .default([]);
```

### 4.4. Índices y consultas

La PK compuesta cubre consultas que empiezan por `barberId` y el índice por
`serviceId` cubre la dirección inversa. No agregar índices adicionales sin una
consulta o reporte que los justifique; revisar los planes de ejecución si
aparecen listados o analíticas nuevos.

## 5. API y lógica de negocio

### Rutas existentes a modificar

Modificar las rutas actuales, no crear controladores genéricos nuevos:

- `app/api/barbers/route.ts`
  - `GET`: incluir asociaciones **siempre como `serviceIds: string[]`** (no como objetos `services`). Mantener `active: true` para el catálogo público.
  - `POST`: aceptar `serviceIds`, crear el barbero y sus asociaciones en una única transacción.
  - `PATCH`: actualizar campos propios y relaciones en una única transacción.
  - `DELETE`: conservar el soft-delete actual (`active: false`). Las asociaciones no se eliminan en ese momento porque el borrado físico no es el flujo administrativo existente.
- `app/api/services/route.ts`
  - Aplicar el equivalente con `barberIds: string[]`.

### Contrato de respuesta (único)

Usar **un solo shape** en ambas rutas para evitar formatos divergentes:

```ts
// GET/POST/PATCH /api/barbers  ->  { ...barber, serviceIds: string[] }
// GET/POST/PATCH /api/services ->  { ...service, barberIds: string[] }
```

Las respuestas administrativas incluyen la lista de IDs asociados (no los
registros completos) para editar sin consultas ambiguas. Los IDs son siempre
`String`/`cuid()`; no se exponen campos internos ni IDs numéricos.

### Permisos y auditoría

- Mantener `requireRole("ADMIN", "OWNER")` en todas las operaciones de
  creación, edición y modificación de asociaciones.
- Las rutas públicas de lectura solo deben exponer registros activos y los
  campos necesarios para reservar.
- Registrar en la bitácora la creación, reemplazo y eliminación de
  asociaciones, incluyendo entidad, IDs afectados y usuario responsable.
- No registrar contraseñas, tokens ni datos sensibles en `oldValues`,
  `newValues` o `metadata`.

#### Auditoría con `lib/binnacle.ts` (existente)

El proyecto ya tiene el sistema de bitácora en `lib/binnacle.ts` con
`logModelMutation`, `buildAuditDiff`, `allowedAuditFieldsByModel` y
`maskedAuditFields`. Para auditar asociaciones es obligatorio:

- Añadir `BarberService` a `allowedAuditFieldsByModel` en `lib/binnacle.ts`
  con los campos `["barberId", "serviceId"]`.
- No añadir `BarberService` a `maskedAuditFields` (no contiene datos
  sensibles; `barberId`/`serviceId` son `cuid()` no sensibles).

Usar `logModelMutation` con `modelName: "BarberService"` al crear, reemplazar
o eliminar asociaciones. Para el reemplazo (deleteMany + createMany) registrar
un único evento que refleje el antes (IDs previos) y el después (IDs nuevos).

#### Invalidación de cache con `lib/dashboard-cache.ts` (existente)

El proyecto cachea catálogos activos en `lib/dashboard-cache.ts` mediante
`unstable_cache` con tag `["dashboard-catalogs"]`. Tras confirmar la
transacción de una asociación, revalidar esa entrada:

```ts
import { revalidateTag } from "next/cache";
await revalidateTag("dashboard-catalogs");
```

Ejecutar la revalidación **después** de confirmar la transacción; nunca dejar
un catálogo cacheado que contradiga la validación de reservas.

### Endpoints de lectura recomendados

No son necesarios para el primer diseño si el landing recibe la relación
server-side. Son recomendables para otros consumidores y deben implementarse
como rutas de lectura separadas:

- `GET /api/barbers/[id]/services`
- `GET /api/services/[id]/barbers`

Estas rutas solo deben devolver registros activos y no deben reutilizar las rutas administrativas protegidas como API pública del landing.

### Validación de reservas

En `app/api/booking/route.ts`, antes de crear la cita, verificar en una sola consulta que el barbero y el servicio estén activos y exista la fila pivote:

```ts
const assignment = await prisma.barberService.findUnique({
  where: { barberId_serviceId: { barberId: body.barberId, serviceId: body.serviceId } },
  include: {
    barber: { select: { active: true } },
    service: { select: { active: true, durationMin: true } },
  },
});
```

Rechazar la combinación inexistente o inactiva con un error de validación controlado antes de crear el cliente, retener el horario o crear la cita. Esto evita que un cliente omita el filtro del frontend.

La misma regla debe aplicarse a cualquier endpoint autenticado que cree o edite citas.

## 6. Landing y wizard de reserva

### Estrategia recomendada

El landing ya es un Server Component y ya carga los dos catálogos. Cargar también la relación en `app/page.tsx` y serializar únicamente IDs públicos:

```ts
type BookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  barberIds: string[];
};

type BookingBarber = {
  id: string;
  name: string;
  specialty: string | null;
  serviceIds: string[];
};
```

Esto evita llamadas cliente contra rutas admin y mantiene la carga inicial rápida. Los campos actuales del componente deben conservarse.

#### Carga de la relación en `app/page.tsx`

El landing (`app/page.tsx`) ya consulta `prisma.service.findMany` y
`prisma.barber.findMany` por separado en un `Promise.all`. Para traer la
relación en **una sola consulta** relacional, usar `prisma.barberService`
filtrando por actividad en ambos lados:

```ts
const assignments = await prisma.barberService.findMany({
  where: { barber: { active: true }, service: { active: true } },
  select: { barberId: true, serviceId: true },
});
```

Luego agrupar `serviceId` por `barberId` (y viceversa) para construir los
`serviceIds`/`barberIds` de los tipos `BookingBarber`/`BookingService`. Esto
evita añadir una tercera query por entidad y mantiene una única fuente de la
verdad para el filtrado del wizard.

### Cambios en `use-booking-wizard.ts`

Agregar al estado derivado o al estado del reducer:

- `availableServices: BookingService[]`;
- `availableBarbers: BookingBarber[]`;
- `isLoadingServices` e `isLoadingBarbers` solo si se elige una fuente remota; con la estrategia server-side pueden ser siempre `false` y no hace falta introducir un fetch artificial.

Reglas de selección:

- Sin selección: mostrar todos los servicios y todos los barberos.
- Al seleccionar servicio `X`: `availableBarbers` contiene solo barberos cuyo `serviceIds` incluya `X`.
- Al seleccionar barbero `Y`: `availableServices` contiene solo servicios cuyo `barberIds` incluya `Y`.
- Si la selección opuesta deja de ser válida, limpiarla y volver a un paso seleccionable; no conservar IDs huérfanos en el borrador local.
- Al cambiar una selección después de retroceder, recalcular las listas desde los catálogos originales, nunca desde la lista ya filtrada.
- Si el resultado está vacío, mostrar un estado explícito y evitar avanzar.
- El estado vacío debe indicar si no hay barberos para el servicio o si no hay
  servicios para el barbero, y ofrecer una forma clara de cambiar la selección.
- Mientras se cargue una fuente remota alternativa, mostrar estado de carga y
  evitar acciones sobre listas incompletas.

La disponibilidad horaria seguirá consultando `/api/availability`; ese endpoint resuelve horarios y no sustituye el filtro de asociaciones.

## 7. Panel administrativo

Los formularios de creación y edición de ambas entidades deben incluir la
nueva relación N:M. La relación debe poder gestionarse desde cualquiera de
los dos lados.

### Formulario de `Barber`

- Cargar los servicios activos disponibles.
- Mostrar un control de selección múltiple para asociar uno o varios servicios.
- En edición, precargar los servicios actualmente asociados.
- Enviar `serviceIds: string[]` junto con los campos propios del barbero.
- Permitir guardar el barbero sin servicios, enviando `serviceIds: []`.

### Formulario de `Service`

- Cargar los barberos activos disponibles.
- Mostrar un control de selección múltiple para asociar uno o varios barberos.
- En edición, precargar los barberos actualmente asociados.
- Enviar `barberIds: string[]` junto con los campos propios del servicio.
- Permitir guardar el servicio sin barberos, enviando `barberIds: []`.

### Reglas comunes del formulario

- Mostrar nombres legibles, pero enviar únicamente IDs `String`/`cuid()`.
- Guardar los campos propios y las asociaciones de forma atómica.
- Al quitar una opción, eliminar la asociación correspondiente.
- Distinguir entre una lista vacía, que elimina todas las asociaciones, y un
  campo omitido, que conserva las asociaciones actuales.
- Si el catálogo opuesto está vacío, mostrar un estado informativo y permitir
  guardar sin asociaciones.
- Las validaciones del cliente no sustituyen la validación de IDs y existencia
  en las rutas API.

Actualizar:

- `app/(dashboard)/barbers/page.tsx`: cargar servicios activos y añadir un multiselect; enviar `serviceIds` al crear/editar.
- `app/(dashboard)/services/page.tsx`: cargar barberos activos y añadir un multiselect; enviar `barberIds` al crear/editar.

El formulario debe permitir guardar una lista vacía. Al editar, mostrar las asociaciones actuales y no borrar relaciones si el campo no fue enviado.

## 8. Seed y datos de prueba

Actualizar `prisma/seed.ts`:

1. Crear barberos y servicios como hoy.
2. Crear asociaciones deterministas usando los IDs creados, por ejemplo con una matriz de índices o por nombre.
3. Asegurar que cada cita demo use una pareja incluida en `barber_services`.

El seed debe ser idempotente según la estrategia existente del archivo y no crear duplicados al ejecutarse de nuevo.

## 9. Pruebas requeridas

Agregar o actualizar pruebas para:

- migración/generación Prisma y clave compuesta;
- creación y edición de barbero con `serviceIds`;
- creación y edición de servicio con `barberIds`;
- reemplazo con `[]` y conservación cuando el campo está omitido;
- rollback completo de la transacción (sin dejar barbero/servicio huérfano) cuando un `serviceIds`/`barberIds` contiene un ID inexistente o inactivo;
- rechazo de IDs duplicados en el schema (`superRefine`) antes de `createMany`;
- filtrado bidireccional del wizard, incluyendo selección inválida y navegación hacia atrás;
- rechazo de una reserva cuya pareja no está asociada;
- aceptación de una pareja asociada con ambos registros activos;
- rechazo de registros inactivos en catálogo y reserva;
- asociaciones múltiples y ausencia de duplicados;
- endpoints de lectura recomendados, cuando se implementen;
- permisos para impedir que roles no autorizados modifiquen asociaciones;
- eventos de bitácora sin datos sensibles;
- revalidación del tag `dashboard-catalogs` después de cambios confirmados;
- seed con todas las citas demo compatibles.

Como mínimo, ampliar `tests/api/flows.test.ts` y crear pruebas unitarias del reducer o de la función de filtrado del wizard. No depender exclusivamente de pruebas visuales para verificar la regla de negocio.

## 10. Orden de implementación

1. Agregar `BarberService` y las relaciones al schema Prisma.
2. Crear la migración y regenerar el cliente.
3. Implementar helpers transaccionales para reemplazar asociaciones.
4. Extender schemas Zod y rutas CRUD.
5. Mantener permisos, registrar cambios en la bitácora (`lib/binnacle.ts`) y añadir `BarberService` a su allowlist.
6. Revalidar el tag `dashboard-catalogs` (`lib/dashboard-cache.ts`) después de confirmar cambios.
7. Validar la pareja en `/api/booking` y en cualquier creación de citas.
8. Actualizar seed y datos demo.
9. Pasar metadatos de relación desde `app/page.tsx` al landing.
10. Implementar el filtrado en `use-booking-wizard.ts` y sus estados vacíos.
11. Actualizar formularios administrativos.
12. Añadir endpoints de lectura recomendados si existen consumidores externos.
13. Añadir pruebas y ejecutar validaciones del proyecto.

## 11. Verificación final

- [ ] `prisma generate` y la migración funcionan en una base limpia.
- [ ] La tabla física es `barber_services`, con PK `(barberId, serviceId)`.
- [ ] Hay FK a `"Barber"` y `"Service"` con `ON DELETE CASCADE`.
- [ ] Existe índice inverso por `serviceId`.
- [ ] No se convierten IDs a enteros ni se añaden columnas legacy.
- [ ] Un barbero admite varios servicios y un servicio varios barberos.
- [ ] POST/PATCH reemplazan relaciones de forma atómica.
- [ ] Omitir una lista en PATCH conserva relaciones; enviar `[]` las elimina.
- [ ] El formulario de `Barber` permite seleccionar múltiples `Service`.
- [ ] El formulario de `Service` permite seleccionar múltiples `Barber`.
- [ ] Los formularios de edición precargan las asociaciones existentes.
- [ ] Quitar una opción del formulario elimina la asociación correspondiente.
- [ ] El booking rechaza parejas no asociadas en backend.
- [ ] El landing muestra todos los registros sin selección.
- [ ] Seleccionar servicio filtra barberos y seleccionar barbero filtra servicios.
- [ ] Cambiar selecciones o navegar hacia atrás recalcula correctamente.
- [ ] El panel admin permite gestionar ambas direcciones.
- [ ] Solo `ADMIN` y `OWNER` pueden modificar asociaciones.
- [ ] Los cambios de asociaciones quedan registrados en la bitácora sin datos sensibles.
- [ ] El tag `dashboard-catalogs` se revalida tras cambios confirmados.
- [ ] Los estados vacíos del wizard indican la causa y permiten cambiar de selección.
- [ ] El seed genera asociaciones compatibles con las citas demo.
- [ ] Las pruebas cubren CRUD, booking y filtrado bidireccional.

## 12. Comandos de validación

```bash
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run test:integration
```

La migración debe desplegarse en un entorno de prueba antes de ejecutar el seed y las pruebas de integración:

```bash
npm run db:migrate
npm run db:seed
```
