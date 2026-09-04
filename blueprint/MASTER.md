# BarberService — Blueprint consolidado (índice maestro)

> **Punto de entrada único** a todas las especificaciones del repositorio `barber`.
> Este documento existe para **eliminar el fraccionamiento de información**: cada feature tiene
> **un spec canónico**, las versiones obsoletas se archivan, y los specs ajenos/inconsistentes
> con el repo se marcan explícitamente. Si una feature no aparece aquí, no es parte del plano.

---

## 1. Cómo usar este documento

1. **Busca la feature** en el mapa (§2). El spec canónico está indicado en la columna `Spec`.
2. **Para implementar o modificar** una feature: abre **solo** su spec canónico (no busques
   versiones viejas — están archivadas).
3. **Para entender el sistema completo**: lee `specv1.0.md` (contrato operativo/guía de
   ingeniería) + los specs canónicos de cada feature.
4. **Para trazabilidad de cambios**: `CHANGELOG.md`.

---

## 2. Mapa de especificaciones

| Spec | Categoría | Estado | Ubicación | Resumen |
| --- | --- | --- | --- | --- |
| **`specv1.0.md`** | Contrato operativo (guía) | Vigente | `blueprint/` | Metodología y reglas de ingeniería (46 secciones) para todo el proyecto. No implementa una feature; es el contrato del agente. |
| **Roles por interfaz** | Feature | ✅ Implementado | `blueprint/spec-roles-v1.md` | `lib/roles.ts` (fuente de verdad rol→ruta/home), portales `/barber` y `/reservations`, `requireRoleOrRedirect`. Rutas de consola protegidas (incluye `/users`, `/manuales`). Verificado en sep 2026 (CHANGELOG Cambio 1). |
| **Modo dark/light** | Feature | ✅ Implementado | `blueprint/spec-dark-mode.md` | Sistema `data-theme` + CSS vars, `ThemeProvider`/`useTheme`, todo el dashboard adaptado. |
| **Expansión de Settings** | Feature | ✅ Implementado | `blueprint/spec-settings-expansion.md` | `GET/PATCH /api/settings`, campos de marca/contacto en `BusinessSettings`, `BusinessHour`, `Testimonial`, panel editable en `/settings`. |
| **Pagos v1** | Feature | ✅ Implementado | `blueprint/spec-payments-v1.md` | `lib/services/payment-service.ts`, `paymentCreateSchema`, campo `Payment.notes`, `POST /api/payments` con reglas R1–R9 y compatibilidad heredada (`id`↔`appointmentId`). |
| **Bitácora (auditoría)** | Feature | ✅ Implementado | `blueprint/bitacora/SPEC-BARBERSERVICE-BITACORA-v1.0.md` | `lib/binnacle.ts` + `app/api/binnacle`, auditoría de negocio (login, citas, pagos). Es el spec **único** del módulo en v1.0. |
| **Visitantes (analítica landing)** | Feature | ✅ Implementado | `app/(dashboard)/visitantes` + `lib/visitors.ts` | Ver nota en §4.1 — un spec ajeno fue archivado; la fuente de verdad es el código. |
| **Notificaciones Telegram** | Feature | ✅ Implementado | `blueprint/telegramNotifications/SPEC-telegram-notifications-v4.md` | `lib/telegram/*`, 3 eventos al chat único de staff. **v4 es el único spec canónico** (ver §3). |
| **Mejoras portal del cliente** | Feature (plan) | 📝 Plan propuesto, no implementado | `blueprint/updating/spec-client-portal-improvements.md` | Mejoras al **portal real del cliente** (`/reservations`). El legado que apuntaba a `/users` está archivado (ver §4.2). |
| **Telegram v1–v3 (obsoletas)** | Feature | 📦 Archivadas | `blueprint/telegramNotifications/archive/` | Versionamientos previos del spec de Telegram; la canónica es **v4** (ver §3). |
| **Specs ajenos / legados** | Documento | 📦 Archivados | `blueprint/archive/` | `SPEC_Visitantes_dashboard.md` (Hotel Río Yurubí, ajeno) y `spec-user-dashboard-improvements-legacy.md` (apuntaba a `/users`). Ver §4. |
| **CHANGELOG** | Registro | Vigente | `blueprint/CHANGELOG.md` | Historial trazable de cambios (reiniciado a la iteración actual; Cambio 1 = roles). |
| **`command.md`** | Nota suelta | Marginal | `blueprint/misc/command.md` | Contiene `npx neonctl@latest init` (comando suelto, no es spec). |
| **`result/desbordeScrollHorizontal.jpg`** | Adjunto | Marginal | `blueprint/misc/result/` | Screenshot (bug de overflow horizontal). No es spec. |

---

## 3. Notificaciones Telegram — evolución consolidada

El módulo se especificó en **4 versiones** (fraccionamiento claro). La cadena es:

| Versión | ID | Reemplaza | Estado |
| --- | --- | --- | --- |
| **v4** | SPEC-2026-08-31-04 | v3 | ✅ **CANÓNICA** — adaptada al repo real (Next 16.3.1, Prisma 7.4, `after()` de `next/server`, `BusinessSettings.telegramChatId` con fallback a `TELEGRAM_CHAT_ID`, sin `server-only`) |
| v3 | SPEC-2026-08-29-03 | v2 | 📦 Archivada |
| v2 | SPEC-2026-08-29-02 | v1 | 📦 Archivada |
| v1 | SPEC-2026-08-29-01 | — | 📦 Archivada |

**Decisiones consolidadas (vigentes, tomadas en v3 y confirmadas en v4):**
- Un **único `chat_id`** (grupo de staff), sin vinculación por usuario ni webhook.
- **Tres eventos**: `APPOINTMENT_CREATED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_COMPLETED`.
- **Regla de oro**: un fallo de Telegram **nunca** bloquea ni revierte crear/confirmar/completar
  una cita; envío fire-and-forget vía `after()`.
- Fuente del `chat_id`: `BusinessSettings.telegramChatId` (editable en `/settings`) → fallback
  `TELEGRAM_CHAT_ID`.

> Las versiones v1–v3 se movieron a `telegramNotifications/archive/`. Consúltalas solo si
> necesitas el razonamiento histórico; para implementar usa **v4**.

---

## 4. Specs con problemas de alineación (auditados)

### 4.1. `audiencia/SPEC_Visitantes_dashboard.md` — **Ajeno a este repo (otro proyecto) — ARCHIVADO**

Este spec describía la analítica de visitantes de **Hotel Río Yurubí**, NO de BarberService
(rutas `src/app/[locale]/(admin)/…`, `requirePermission("analytics:read")` de `src/lib/rbac.ts`,
i18n ES/EN). **Se movió a `blueprint/archive/SPEC_Visitantes_dashboard.md`** durante la
consolidación documental porque no aporta valor al plano de este repo.

**La implementación REAL de visitantes en BarberService** (fuente de verdad = código):
- Ruta: `app/(dashboard)/visitantes/page.tsx` (server component, `force-dynamic`).
- Acceso: `session.role` `ADMIN` **o** `OWNER` (consistente con `ROUTE_RULES["/visitantes"]`).
- Modelos Prisma: `VisitorSession`, `PageView`.
- Captura: `app/api/visits/route.ts` (público, anónimo, sin IP persistida, `rateLimit`, descarta
  bots, geo vía cabeceras de Vercel, `detectOrganic`/`computeBounce`).
- Helpers: `lib/visitors.ts`, `lib/validations/visits.ts` (`visitSchema`), `lib/rate-limit.ts`.
- Zona horaria del negocio: `getBusinessTimezone`, `zonedDayStartUtc`…; periodo por defecto = mes en curso.
- Gráficos: `VisitorsOverviewChart` (área), `TopSectionsChart` (barras horizontales), `VisitorsFilter`.

### 4.2. `updating/spec-user-dashboard-improvements.md` — **Inconsistente con el repo — ARCHIVADO + reescrito**

El spec describía la mejora de `/users` como "dashboard del cliente" (reservas, reprogramar,
gráfico de gasto, exportar historial, `/api/reservations/[id]/reschedule|cancel`). En BarberService
`/users` es la página **de administración de usuarios** (`app/(dashboard)/users`, `OWNER/ADMIN`);
los endpoints `/api/reservations/*` **no existen**.

**Acción tomada:** el original se archivó como `blueprint/archive/spec-user-dashboard-improvements-legacy.md`
y se creó el spec canónico corregido **`blueprint/updating/spec-client-portal-improvements.md`**,
reorientado al **portal real del cliente** (`/reservations`), con las rutas, modelos y guardas
reales y separando lo ya implementado (badges de estado, calendario, dialog, KPIs, tema) de las
mejoras propuestas.

---

## 5. Reglas anti-fraccionamiento (aplicar en el futuro)

1. **Un spec canónico por feature.** Cuando una feature evolucione, **actualiza el mismo archivo**
   en lugar de crear `-v2/-v3`. Si necesitas preservar el historial, usa la tabla de "evolución"
   dentro del spec o la línea de CHANGELOG — no nuevos archivos.
2. **Archiva lo obsoleto** en lugar de borrarlo: versiones de una feature → `archive/` dentro de la
   carpeta de esa feature (p.ej. `telegramNotifications/archive/`); specs ajenos/legados del plano →
   `blueprint/archive/`.
3. **No metas specs de otros proyectos** (p.ej. Hotel Río Yurubí) al blueprint de BarberService.
4. **Registro todo** en el índice maestro: al añadir/mover/archivar un spec, actualiza §2 y §3.
5. **El estado** de cada spec (implementado / planeado / archivado / ajeno) se refleja en la
   columna `Estado` de §2; el objetivo es que un lector no tenga que adivinar qué está vigente.

---

## 6. Fuente de verdad

- **La implementación existente es la fuente primaria de verdad** (nombres, contratos, rutas,
  comportamiento) — principio que el propio `specv1.0.md` (§3.1) establece. Cuando un spec
  contradiga el código, **gana el código**; dicho conflicto debe marcarse aquí en §4.
- `lib/roles.ts` es la única fuente de verdad de rol→ruta/home; no se duplica en Sidebar,
  layouts ni APIs.
