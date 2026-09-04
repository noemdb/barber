# BarberService — Registro de modificaciones

Este documento asienta, de forma trazable, toda modificación implementada contra el contrato
`blueprint/specv1.0.md`. Cada entrada indica alcance, archivos, decisiones, verificación y
regresión conocida.

> ## 🔄 Registro reiniciado (nueva iteración)
>
> El historial previo (Cambio 1‑18, correspondiente al ciclo anterior de desarrollo) se descarta
> porque este documento se asocia a un **nuevo proyecto / iteración**. El formato y la convención
> de registro se mantienen. Cualquier cambio de esta iteración se asienta a partir de la sección
> siguiente.

---

## Convención para futuros cambios

Todo cambio de código debe añadir una entrada en este documento (`blueprint/CHANGELOG.md`) antes
de declararse terminado: alcance, archivos, decisiones, verificación y riesgos. Los cambios de
esquema deben producir su migración Prisma (§7) y reflejarse en el seed si corresponde (§36).

Cada entrada sigue esta plantilla:

```md
## YYYY-MM-DD · Cambio N — Título breve

### Objetivo

Por qué se hace este cambio.

### Qué se hizo

Decisión de diseño y acciones concretas.

### Archivos

| Archivo | Acción |
| --- | --- |
| `ruta/archivo` | creado / modificado / eliminado |

### Verificación

- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npm run build`: OK.
- Pruebas relevantes (si aplica).

### Regresión conocida

Limitaciones o efectos colaterales a considerar.
```

---

## 2026-09-01 · Cambio 1 — Sistema de roles por interfaz (admin / barber / client)

### Objetivo

Redirigir a cada usuario a su interfaz tras el login y acotar cada portal a los datos propios
del usuario autenticado, eliminando la duplicación de reglas de acceso. Antes el login solo
distinguía `CLIENT` → `/` y el resto → `/dashboard`, y los roles estaban hardcodeados en
varios archivos; no existía interfaz para barbero ni para cliente.

### Qué se hizo

- **`lib/roles.ts`** (nuevo): fuente de verdad edge-safe con `ROLE_HOME`, `ROUTE_RULES`,
  `homeForRole`, `isRoleAllowed` y `rolesForPath` (matcheo por prefijo, soporta rutas anidadas
  como `/settings/binnacle`).
- **`lib/scope.ts`** (nuevo, server-only): `getCurrentBarber`, `barberScope`, `getCurrentClient`
  (usa `findFirst` porque `Client.email` no es único) y `clientScope`.
- **`lib/permissions.ts`**: guard `requireRoleOrRedirect` para layouts (redirige a `homeForRole`,
  no lanza `DomainError`).
- **`proxy.ts`**: generalizado a `ROUTE_RULES` + `isRoleAllowed` + `homeForRole`; matcher
  expandido con `/barber` y `/reservations`.
- **`app/login/page.tsx`**: redirige con `homeForRole(role)` (elimina la rama CLIENT→`/`).
- **Portales nuevos**: `app/(dashboard)/layout.tsx` solo `OWNER`/`ADMIN`; `app/barber/`
  (`layout`, `page`, `appointments`, `clients`, `binnacle`) con scope por `barberId`;
  `app/reservations/` (`layout`, `page`, `binnacle`) con scope por `clientId` (resuelto por
  email). Shells en `components/barber/` y `components/client/`.
- **APIs**: `/api/appointments` y `/api/clients` restringidas a `ADMIN`/`OWNER`; `/api/binnacle`
  permite `BARBER` con filtro `subjectId`/`createdBy` = sesión. Los portales consultan Prisma en
  servidor con su scope (no dependen de las APIs globales).
- **`components/sidebar.tsx`**: ya no hardcodea roles por ítem; deriva visibilidad de
  `rolesForPath(href)` (matriz central). Alineado con §4.4 (BARBER no ve rutas de consola).

### Archivos

| Archivo | Acción |
| --- | --- |
| `lib/roles.ts` | creado |
| `lib/roles.test.ts` | creado |
| `lib/scope.ts` | creado |
| `lib/permissions.ts` | modificado |
| `proxy.ts` | modificado |
| `app/login/page.tsx` | modificado |
| `app/(dashboard)/layout.tsx` | modificado |
| `app/barber/*` | creado (layout, page, appointments, clients, binnacle) |
| `app/reservations/*` | creado (layout, page, binnacle) |
| `components/barber/*` | creado (barber-shell, appointments-filter) |
| `components/client/*` | creado (client-shell) |
| `components/sidebar.tsx` | modificado |
| `app/api/appointments/route.ts` | modificado (ADMIN/OWNER) |
| `app/api/clients/route.ts` | modificado (ADMIN/OWNER) |
| `app/api/binnacle/route.ts` | modificado (scope BARBER) |

### Verificación

- `npm run typecheck`: OK.
- `npm run test`: OK (59 tests, incluye anti-loop de roles).
- `npm run build`: OK (rutas `/barber` y `/reservations` generadas; Proxy activo).
- `npx eslint` sobre archivos del rol: OK (los errores restantes del repo son preexistentes en
  `(legal)/`, `visitors-filter.tsx`, `weekly-revenue-chart.tsx`, ajenos a este cambio).

### Regresión conocida

- El barbero ya no entra al console admin (decisión §4.4); su home es `/barber`.
- El rol se congela en el JWT al iniciar sesión; un cambio de rol exige re-login para la
  redirección edge (mitigación documentada en el spec, §4.6). Los guards de layouts y APIs
  releen el rol desde BD.
- `Client` se empareja por email con `findFirst` (el primero creado); se recomienda en una fase
  futura añadir `Client.userId` opcional para robustez ante cambios de correo.

---

## 2026-09-03 · Cambio 2 — Consolidación documental del blueprint

### Objetivo

Eliminar el fraccionamiento de información del plano: había 4 versiones del spec de Telegram, un
spec ajeno (Hotel Río Yurubí) y un spec que apuntaba a una ruta equivocada (`/users`), todo disperso
y sin índice. Se busca que cada feature tenga **un spec canónico** y que el plano sea navegable.

### Qué se hizo

- **`blueprint/MASTER.md`** (nuevo): índice maestro consolidado — mapa de specs con categoría,
  estado y resumen; línea de evolución de Telegram; sección de specs auditados (ajenos/inconsistentes);
  reglas anti-fraccionamiento. Punto de entrada único.
- **Telegram**: se archivaron `v1`, `v2` y `v3` en `blueprint/telegramNotifications/archive/`,
  dejando `SPEC-telegram-notifications-v4.md` como único canónico.
- **Spec ajeno**: `audiencia/SPEC_Visitantes_dashboard.md` (Hotel Río Yurubí, rutas `src/…`,
  `requirePermission("analytics:read")`) se movió a `blueprint/archive/SPEC_Visitantes_dashboard.md`.
- **Spec inconsistente**: `updating/spec-user-dashboard-improvements.md` (apuntaba a `/users` como
  dashboard de cliente) se archivó como `blueprint/archive/spec-user-dashboard-improvements-legacy.md`
  y se creó el canónico corregido **`blueprint/updating/spec-client-portal-improvements.md`**,
  reorientado al portal real del cliente (`/reservations`, `app/reservations/page.tsx`), con rutas,
  modelos y guardas reales y diferenciando lo ya implementado (badges de estado, calendario,
  `CreateAppointmentDialog`, KPIs, tema) de las mejoras propuestas.

### Archivos

| Archivo | Acción |
| --- | --- |
| `blueprint/MASTER.md` | creado |
| `blueprint/telegramNotifications/SPEC-telegram-notifications-v1.md` | movido a archive/ |
| `blueprint/telegramNotifications/SPEC-telegram-notifications-v2.md` | movido a archive/ |
| `blueprint/telegramNotifications/SPEC-telegram-notifications-v3.md` | movido a archive/ |
| `blueprint/audiencia/SPEC_Visitantes_dashboard.md` | movido a blueprint/archive/ |
| `blueprint/updating/spec-user-dashboard-improvements.md` | movido a archive/ (legacy) |
| `blueprint/updating/spec-client-portal-improvements.md` | creado (reescrito contra `/reservations`) |

### Verificación

- `npm run lint` / `typecheck` / `build`: **no aplica** (solo documentación, sin código TypeScript).
- Revisión manual: el árbol de `blueprint/` queda indexado en `MASTER.md`; cada feature tiene un único
  spec canónico; los specs ajenos/legados quedan archivados y señalados.

### Regresión conocida

- Ninguna funcionalística. Los specs archivados siguen disponibles para consultar el historial de
  decisiones; el índice maestro (`MASTER.md`) es el nuevo punto de entrada y referencia de trazabilidad.
- `spec-user-dashboard-improvements` (ahora `-legacy`) apuntaba a una ruta equivocada; el plan se
  conserva, corregido, en `spec-client-portal-improvements.md` como plan **no implementado todavía**.

---

## 2026-09-04 · Cambio 3 — Dashboard: periodo configurable, filtros ricos y rendimiento

### Objetivo

Enriquecer el panel de administración: hacer configurable el **periodo** (con opción "Todos"),
permitir **multi-selección** de filtros, añadir paneles de datos más útiles (desempeño por barbero,
servicios por ingreso, horas pico) y reducir el peso de las consultas (caché + índices).

### Qué se hizo

- **Periodo**: dropdown con Hoy / Semana / Mes / 3 meses / 6 meses / **Todos** (histórico completo,
  acotado a 365 días vía `MAX_ALL_DAYS`). En "Todos" se oculta la serie "Periodo anterior".
- **Filtros**: contador de resultados ("N citas · USD X"), chips de filtros activos con ✕ individual,
  restauración del último filtro en `localStorage`, botón **Limpiar**. Multi-selección de
  barbero/servicio/cliente (URL `barberId=a,b`; Prisma `in`, SQL de ingresos con `= ANY(...)`).
- **Paneles nuevos**: Desempeño por barbero (citas, % ocupación, ticket, ingresos), Servicios más
  facturados (por ingreso del periodo), Horas pico (mapa de calor día×hora).
- **Consistencia**: "Citas del periodo" excluye canceladas/no-asistidas (alineado con el desempeño).
- **Accesibilidad del dropdown**: `role="combobox"`, `aria-controls`, `aria-activedescendant`.
- **Rendimiento**: caché con `unstable_cache` (300s) para catálogos, settings+horarios y buckets de
  ingresos; índices `Appointment(serviceId)` y `Payment(status, paidAt)` (migración
  `20260904120000_add_dashboard_indexes`).
- **Tests**: 87 totales — helpers de horario, render de paneles (`renderToStaticMarkup`) y SQL de
  `aggregateRevenueBuckets` (mock de Prisma).

### Archivos

| Archivo | Acción |
| --- | --- |
| `components/dashboard/dashboard-filters.tsx` | modificado (periodo, chips, localStorage, multi) |
| `components/dashboard/filter-dropdown.tsx` | modificado (accesibilidad, `disableReset`) |
| `components/dashboard/multi-filter-dropdown.tsx` | creado (multi-selección) |
| `components/dashboard/barber-performance.tsx` | creado (desempeño por barbero) |
| `components/dashboard/peak-hours-chart.tsx` | creado (horas pico) |
| `app/(dashboard)/dashboard/page.tsx` | modificado (cómputos, paneles, periodo "Todos", tope) |
| `lib/dashboard.ts` | modificado (helpers de horario, rango "all") |
| `lib/dashboard-queries.ts` | modificado (caché + `= ANY`) |
| `lib/dashboard-cache.ts` | creado (catálogos/settings cacheados) |
| `lib/dashboard.test.ts`, `lib/dashboard-queries.test.ts`, `lib/dashboard-render.test.ts` | tests |
| `prisma/schema.prisma`, `prisma/migrations/20260904120000_add_dashboard_indexes` | índices |

### Verificación

- `npm run typecheck`: OK (0 errores).
- `npm run lint`: OK.
- `npm run test`: OK (87/87).
- `npm run build`: OK.
- `prisma migrate deploy`: OK (14 migraciones).

### Regresión conocida

- Caché de catálogos/settings/ingresos refresca cada 300s; la agenda de hoy queda fresca.

---

## 2026-09-04 · Cambio 4 — Auditoría y sincronización blueprint / manuales / código

### Objetivo

Revisar la coherencia entre `blueprint/`, `docs/manual/*.md` y el código real, y corregir las
divergencias encontradas, dejando el plano y la documentación al día.

### Qué se hizo

- **Manuales al día**: `admin.md` §3.1 (KPIs "del periodo", default Hoy), §3.3 (secciones reales:
  desempeño, comparativo, estado, servicios por ingreso, horas pico), §8.1/§8.3 (cobro solo vía API;
  nota de pago ≤500 chars y se guarda), §9 y §11.1 (la configuración **no** se audita). `barber.md`
  §4.2/§6/§7 (portal de **solo lectura**; el cambio de estado lo gestiona la administración).
  `client.md` §4/§4.2 (botones reales "Registrar cita" y "Ver indisponibilidad semanal"; el widget
  muestra turnos ocupados/libres).
- **`Payment.notes` migrado** (resolvió un contrato roto): schema + migración
  `20260904130000_add_payment_notes` + el servicio lo persiste. Coherente con zod (≤500) y el spec.
- **Specs ajustados**: `spec-roles-v1.md` `ROUTE_RULES` ahora incluye `/users` y `/manuales`;
  `spec-client-portal-improvements.md` corrige la referencia de creación (`app/api/booking` →
  `POST /api/appointments`).
- **Blueprint consolidado**: `command.md` y `result/` movidos a `blueprint/misc/`; `MASTER.md` §2 al
  día (rutas de marginales, resumen de roles, filas de specs archivados).

### Archivos

| Archivo | Acción |
| --- | --- |
| `docs/manual/admin.md`, `docs/manual/barber.md`, `docs/manual/client.md` | modificados |
| `prisma/schema.prisma`, `prisma/migrations/20260904130000_add_payment_notes` | `Payment.notes` |
| `lib/services/payment-service.ts` | modificado (persiste `notes`) |
| `blueprint/spec-roles-v1.md`, `blueprint/updating/spec-client-portal-improvements.md` | modificados |
| `blueprint/MASTER.md` | modificado (mapa al día) |
| `blueprint/misc/command.md`, `blueprint/misc/result/` | movidos |
| skill `barber-development` → `references/portals-and-manuals.md` | actualizado |

### Verificación

- `npm run typecheck`: OK (0 errores).
- `npm run lint`: OK.
- `npm run test`: OK (87/87).
- `npm run build`: OK.
- `prisma migrate deploy` / `migrate status`: "up to date".

### Regresión conocida

- La interfaz **no** expone aún el formulario de **cobro** (el `POST /api/payments` solo se usa por
  API); el manual y el skill lo aclaran como pendiente.
