# BarberService — Registro de modificaciones

Este documento asienta, de forma trazable, toda modificación implementada contra el contrato
`blueprint/specv1.0.md`. Cada entrada indica alcance, archivos, decisiones, verificación y
regresión conocida.

---

## 2026-08-20 · Cambio 1 — Endurecimiento de la capa API

### Objetivo

Alinear la capa API con los requisitos del spec: validación declarativa (§13 Zod), contrato de
errores predecible (§12), errores de dominio con códigos (§21) y autorización por rol verificada
en servidor (§10–§11).

### Qué se hizo

- **Zod 4** como validador de entrada obligatorio en servidor (body/query/form).
- **Contrato de respuestas** estandarizado:
  - Éxito: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "code", "message" } }`
- **Códigos de dominio**: `VALIDATION_ERROR`, `UNAUTHORIZED` (401), `FORBIDDEN` (403),
  `NOT_FOUND` (404), `APPOINTMENT_CONFLICT` (409), `INTERNAL_ERROR` (500).
- **Autorización por rol**: `requireRole("ADMIN","OWNER")` en todas las mutaciones
  (crear/editar/eliminar citas, barberos, clientes, servicios). Las lecturas exigen solo sesión.
  `requireRole` re-valida usuario activo + rol contra la DB, no solo el JWT (§10).
- **Type safety**: eliminado todo `any` de código fuente; los únicos `any` restantes pertenecen
  al cliente Prisma auto-generado (gitignored).

### Archivos

| Archivo | Acción |
| --- | --- |
| `lib/errors.ts` | reescrito: `ErrorCodes` + `DomainError` (sin dependencias de Next) |
| `lib/api.ts` | nuevo: `ok`, `apiError`, `withApi` (envelope Next) |
| `lib/permissions.ts` | nuevo: `requireRole()` con verificación en DB |
| `lib/validations/index.ts` | nuevo: schemas Zod (login, cita crear/patch, barbero, cliente, servicio) |
| `lib/auth.ts` | `requireSession` lanza `DomainError(UNAUTHORIZED, 401)` |
| `app/api/auth/login` | Zod + envelope + mapeo `sub` |
| `app/api/auth/logout` | envelope |
| `app/api/appointments` y `[id]` | envelope + Zod + roles + códigos |
| `app/api/barbers`, `clients`, `services` | envelope + Zod + roles |
| `app/login/page.tsx` y páginas dashboard | consumo del envelope; sin `any`; legibles |
| `lib/validation.ts` | eliminado (código muerto, sustituido por Zod) |
| `package.json` | +`zod@4.4.3` |
| `.env.local` | creado local con placeholders (gitignored) |
| imports Prisma | `@/app/generated/prisma` → `.../prisma/client` (generador Prisma 7) |

### Decisión de diseño

- Separación `lib/errors.ts` (dominio puro, testeable sin Next) vs `lib/api.ts` (adaptador HTTP).
- Rol `OWNER` tratado como privilegiado junto a `ADMIN`; `BARBER` solo lectura (portal del
  barbero es alcance futuro, §39).
- El solapamiento y `end = start + duration` permanecen en servidor (§6.2–§6.3).

### Verificación

- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores (5 warnings preexistentes en sidebar/topbar/login/postcss).
- `npm run build`: OK (14 rutas).

### Riesgos / regresión

- Cambio de contrato de API (envelope): consumidores actualizados; integraciones externas
  futuras deben usar el nuevo contrato.
- PATCH de estado no re-evalúa solapamiento (consistente con §6.3, no se permite cambiar
  duración).

---

## 2026-08-20 · Cambio 2 — Capa de servicios de citas + unit tests

### Objetivo

Cumplir §14–§15 (extraer reglas de negocio fuera de los route handlers) y §23 (tests unitarios
de reglas de citas, solapamiento, duración y precio).

### Qué se hizo

- **`lib/services/appointment-service.ts`**: reglas de dominio aisladas y reutilizables:
  - `calculateAppointmentEnd(start, durationMin)` → `end = start + duration` (§6.3).
  - `hasOverlap(existing, start, end)` → regla `newStart < existingEnd && newEnd > existingStart` (§6.2).
  - `checkAppointmentConflict(repo, barberId, start, end)` → lanza `APPOINTMENT_CONFLICT` (409).
  - `createAppointment(repo, input)` → resuelve servicio (`NOT_FOUND`), calcula fin, valida
    solapamiento y persiste con `priceCents` derivado del servicio (§6.4).
  - Inyección de dependencias mediante interfaz `AppointmentRepository` (seam de testeo; el
    route handler adapta Prisma).
- **Refactor**: `POST /api/appointments` delega en `createAppointment`; eliminada la lógica
  inline de solapamiento del route handler.
- **Vitest 4** + `vitest.config.mts` + scripts `test`/`test:watch`.
- **Tests**: 17 unit tests de las reglas (duración, solapamiento con bordes tangentes, conflictos,
  precio, `NOT_FOUND`, propagación del resultado).

### Archivos

| Archivo | Acción |
| --- | --- |
| `lib/services/appointment-service.ts` | nuevo |
| `lib/services/appointment-service.test.ts` | nuevo (17 tests) |
| `app/api/appointments/route.ts` | POST usa el servicio |
| `vitest.config.mts` | nuevo |
| `package.json` | scripts `test`, `test:watch`; +`vitest@4.1.11` (dev) |

### Verificación

- `npm run test`: 17/17 OK.
- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores.
- `npm run build`: OK.

### Riesgos / regresión

- `findBarberAppointments` excluye `CANCELLED` en el adaptador Prisma (el servicio es agnóstico
  a esa regla de exclusión).
- El seam `AppointmentRepository` solo cubre el flujo de creación; `PATCH`/`DELETE` siguen en el
  route handler (refactor de ampliación futura).

---

## 2026-08-20 · Cambio 3 — Eliminación de datos mock del dashboard

### Objetivo

Cumplir §19 ("El dashboard debe mostrar datos reales. No utilizar valores mock en producción")
y §35 (datos mock solo para seed/tests/dev). Sustituir las cifras hardcodeadas por cálculos del
backend.

### Qué se hizo

- **Ingresos recientes (últimos 7 días)**: el gráfico de barras ya no usa alturas hardcodeadas
  (`[35,48,...]`); se calcula desde `Payment` (`status = PAID`) agregando `amountCents` por día
  local, con altura relativa al máximo y estado vacío.
- **Servicios más vendidos**: se reemplaza la lista y conteos hardcodeados por agregación real
  `appointment.groupBy({ by: ["serviceId"], where: { status: "COMPLETED" } })` + nombres desde
  `Service`, ordenados por ventas (top 4), con estado vacío.
- **Sidebar**: el badge `6` hardcodeado de "Citas" se sustituye por el conteo real de citas del día
  (solo se muestra si `> 0`), consultado en el layout del dashboard (server component, §3.4) y
  pasado como prop a `Sidebar`.

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/(dashboard)/dashboard/page.tsx` | consultas reales + estados vacíos; se preserva el resto del layout |
| `app/(dashboard)/layout.tsx` | consulta `appointment.count` del día y pasa `appointmentsToday` |
| `components/sidebar.tsx` | prop `appointmentsToday`; badge real |

### Decisión de diseño

- Agregación en servidor (server component, `force-dynamic`) y no en cliente (§19).
- "Más vendidos" medido como número de citas completadas por servicio (semántica de ventas).
- Badge oculto con 0 citas para evitar el "0" visual.

### Verificación

- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores (5 warnings preexistentes).
- `npm run test`: 17/17 OK.
- `npm run build`: OK.

### Riesgos / regresión

- El agrupado por día usa la zona horaria local del servidor (ver §33 pendiente).
- `Servicios más vendidos` cuenta citas `COMPLETED`; no distingue cobradas/pagadas (los pagos
  todavía no tienen flujo de registro).

---

## 2026-08-20 · Cambio 4 — Migraciones aplicadas a Neon + seed integral de demo

### Objetivo

Aplicar el esquema a la base de Neon y proveer un seed completo e idempotente que demuestre
todos los casos de uso (§36), cubriendo los estados de citas, pagos y el flujo de roles.

### Qué se hizo

- **Migraciones**: `prisma migrate deploy` sobre Neon (schema actual = `00000000000000_init`).
  Se usó la **URL directa** de Neon (host sin `-pooler`) porque Prisma Migrate requiere conexión
  directa para DDL; la URL de pooler sigue siendo la de runtime.
- **Seed reescrito** (`prisma/seed.ts`), idempotente:
  - 1 negocio (`BusinessSettings`), 2 usuarios (OWNER admin + BARBER enlazado a Daniel), 3 barberos,
    5 servicios, 10 clientes.
  - 21 citas distribuidas en −6..+2 días cubriendo los 5 estados:
    `PENDING=4 CONFIRMED=4 COMPLETED=11 CANCELLED=1 NO_SHOW=1` (4 citas el día de hoy).
  - 11 pagos cubriendo los 3 estados y los 4 métodos:
    `PAID` (CASH/CARD/TRANSFER/OTHER), `PENDING`, `REFUNDED` — solo en citas `COMPLETED`.
  - Sin solapamientos por barbero (§6.2): duración máxima 45 min con separación ≥ 60 min.
  - Idempotente: los datos maestros se hacen `upsert`; las citas/pagos solo se crean si no existen.
- **Credenciales demo** documentadas en `README.md` (admin y barbero).
- Eliminado `.env.local` placeholder (sombraba al `.env` real con credenciales en Next).

### Archivos

| Archivo | Acción |
| --- | --- |
| `prisma/seed.ts` | reescrito completo |
| `README.md` | cuentas demo (admin + barbero) |
| `.env.local` | eliminado (placeholders que sombreaban `.env`) |
| Neon | migración `00000000000000_init` aplicada + datos demo insertados |

### Verificación

- `npx prisma migrate deploy`: todas las migraciones aplicadas.
- `npm run db:seed`: primera corrida 21 citas / 11 pagos; segunda corrida no duplica (0 creadas).
- Distribución verificada vía consultas `groupBy` sobre Neon.
- `npx tsc --noEmit`: 0 errores.

### Riesgos / regresión

- Las fechas de las citas demo se calculan relativas al día de ejecución del seed; si la base
  ya tiene citas, el seed no crea más (idempotencia por diseño, no destruye datos de usuario).
- El seed de pagos no pasa por `createAppointment` del servicio (reglas de solapamiento ya
  garantizadas por el plan); no usa `$transaction` (ver pagos §32 pendiente).
- `prisma migrate dev` seguirá requiriendo `shadowDatabaseUrl` o URL directa para Neon.

---

## 2026-08-20 · Cambio 5 — Landing page pública

### Objetivo

Diseñar el landing page de la marca (similar al de la demo de referencia de barbería:
servicios, equipo, contacto y CTA de reserva), con datos reales de la base de datos.

### Qué se hizo

- `app/page.tsx` reescrito como **server component** que reemplaza el redirect a `/login`:
  - Fetch en paralelo de `BusinessSettings`, `Service` activos y `Barber` activos.
  - Navbar sticky con marca (Scissors + nombre del negocio), anclas (Servicios / Equipo / Contacto)
    y botón "Iniciar sesión" → `/login`.
  - Hero oscuro (estética zinc del login): tagline, nombre del negocio, CTA "Reservar cita"
    (→ `/login`) y "Ver servicios" (→ `#servicios`); stats reales (nº servicios y barberos).
  - Sección Servicios: tarjetas con precio (`money`, currency del negocio), duración y descripción.
  - Sección Equipo: tarjetas de barberos con avatar de iniciales, especialidad y teléfono.
  - Sección Contacto: teléfono/mail/dirección desde `BusinessSettings` + CTA de reserva.
  - Footer con marca, año y enlace al área de administración.
  - `generateMetadata` con el nombre del negocio.
- Sin dependencias nuevas (usa `lucide-react`, `lib/prisma`, `lib/format` ya existentes).

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/page.tsx` | reescrito (landing en vez de redirect) |

### Verificación

- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores (5 warnings preexistentes).
- `GET /` (dev): 200, renderiza nombre del negocio, servicios y barberos reales de Neon.

### Riesgos / regresión

- El landing consulta la BD en cada request (sin cache); aceptable para esta fase, ver
  rendimiento (§35) pendiente.
- "Reservar cita" redirige al login porque el flujo de reserva del cliente final aún no existe
  (el app gestiona citas internamente).

---

## 2026-08-20 · Cambio 6 — Landing page premium

### Objetivo

Elevar el landing (Cambio 5) de "básico" a nivel premium, manteniendo datos reales del negocio
y la identidad visual (oscuro + dorado + serif editorial).

### Qué se hizo

- **Tipografía**: fuentes de Google vía `next/font/google` en `app/layout.tsx`
  (`Playfair Display` display serif con eje itálico + `Inter` sans), expuestas como variables
  `--font-playfair` / `--font-inter`.
- **Tema** (`app/globals.css`): tokens Tailwind 4 en `@theme` — `--font-display`, `--font-sans`,
  paleta dorada (`--color-gold*`), animaciones `--animate-marquee` / `--animate-float`
  (con `@keyframes`), `scroll-behavior: smooth` y `scroll-padding-top` para anclas bajo nav fija.
- **Componentes nuevos**:
  - `components/landing/reveal.tsx` (client): revelado al hacer scroll vía `IntersectionObserver`
    (opacidad + translate, con `transition-delay` por índice).
  - `components/landing/nav.tsx` (client): nav fija con `backdrop-blur` y borde al hacer scroll,
    menú móvil hamburguesa, CTA dorado.
- **`app/page.tsx`** (server) reescrito con secciones premium:
  - Hero: eyebrow dorado, titular serif gigante con palabra en itálico dorado, CTAs
    (dorado + ghost), fila de sellos (5.0, reserva en 2 min), collage decorativo con tarjeta
    "Desde {precio}" (precio real mínimo), tarjeta flotante del primer barbero (datos reales)
    y chip "Agendado hoy" con `animate-float`; textura de grano SVG.
  - Marquee dorado animado con palabras de servicios (`animate-marquee`).
  - Servicios: lista editorial dividida (número serif, nombre, descripción, duración, precio
    dorado) con hover; datos reales ordenados por precio.
  - Equipo: tarjetas con avatar dorado de iniciales, especialidad y teléfono (datos reales).
  - Experiencia: 3 features con iconos + banda de stats reales (nº servicios/barberos).
  - Testimonios: 3 tarjetas curadas (estáticas).
  - Contacto: banner CTA "Reserva en minutos" + tarjetas reales de teléfono/correo/dirección.
  - Footer: columnas (marca, explorar, contacto real, horario) + barra inferior.
- **Render**: `export const dynamic = "force-dynamic"` para que `/` refleje cambios de BD
  (sin force-dynamic, Next la prerenderizaba estática horneando la data en build).

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/layout.tsx` | fuentes `next/font/google` (Playfair + Inter) |
| `app/globals.css` | tema @theme (gold, fonts, animaciones) + smooth scroll |
| `components/landing/reveal.tsx` | nuevo (reveal on scroll) |
| `components/landing/nav.tsx` | nuevo (nav fija + menú móvil) |
| `app/page.tsx` | reescrito (landing premium) |

### Verificación

- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores (5 warnings preexistentes).
- `npm run build`: OK; `/` pasa de estático (`○`) a dinámico (`ƒ`).
- `GET /` (dev): 200 con fuentes, marquee, servicios y barberos reales.

### Riesgos / regresión

- `next/font/google` descarga las fuentes al compilar/deployar (Vercel necesita red a Google;
  en dev ya se verificó acceso).
- La data sigue siendo "en vivo" en cada request de `/` (sin cache); opción futura: `revalidate`
  por tiempo si el volumen crece (§35).
- Testimonios y horario son estáticos (no hay modelos en BD para ello).

---

## 2026-08-20 · Cambio 7 — Landing premium v2: tipografía condensada + layout compacto

### Objetivo

Sustituir la tipografía editorial (Playfair) por una display condensada de corte barbershop
(Oswald) con body Manrope, y compactar paddings/margins/spacing de todo el landing.

### Qué se hizo

- **Fuentes** (`app/layout.tsx`): `Playfair Display` + `Inter` → **`Oswald`** (display condensada,
  variable) + **`Manrope`** (body), como `--font-oswald` / `--font-manrope`.
- **Tema** (`app/globals.css`): `--font-display: var(--font-oswald)` y
  `--font-sans: var(--font-manrope)`.
- **Landing** (`app/page.tsx` + `components/landing/nav.tsx`):
  - Titulares en Oswald **uppercase** con tracking ajustado y énfasis dorado (se eliminan los
    `<em>` itálicos, Oswald no tiene eje itálico). Ej.: "EL ARTE DE UN BUEN CORTE.".
  - Precios/números/labels del menú en Oswald semibold.
  - Equipo en filas horizontales (avatar + nombre + especialidad + teléfono) en vez de tarjetas
    verticales grandes.
  - Features con layout horizontal compacto (icono + texto en línea).
  - Spacing reducido: nav `py-5→py-3`, secciones `py-24/28→py-14/16`, héroes
    `pt-36/44→pt-28/32`, listas `mt-14→mt-7`, rows `py-7→py-4`, cards `p-8→p-4/5`,
    CTA `py-16→py-10`, footer `py-16→py-10`, gaps de grillas `gap-5→gap-3`.
  - Tipografías de texto corporal reducidas (párrafos y metadatos a `text-[13px]`).

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/layout.tsx` | Oswald + Manrope (reemplazan Playfair + Inter) |
| `app/globals.css` | tokens `--font-display`/`--font-sans` actualizados |
| `app/page.tsx` | headings uppercase, layout compacto, equipo en filas |
| `components/landing/nav.tsx` | marca Oswald, spacing compacto |

### Verificación

- `npx tsc --noEmit`: 0 errores.
- `npm run lint`: 0 errores (5 warnings preexistentes).
- `npm run build`: OK; `/` dinámico (`ƒ`).
- `GET /` (dev): 200 con fuentes oswald/manrope y render compacto.

### Riesgos / regresión

- Oswald es una variable font sin itálicos: se quitaron las cursivas doradas de los titulares.
- El énfasis dorado ahora se hace solo con color (no estilo), manteniendo el acento premium.
- Conteo de descargas de fuentes: 2 families (misma cantidad que antes).

---

## 2026-08-20 · Cambio 8 — Reserva de citas pública (diálogo + flujo invitado)

### Objetivo

Permitir reservar una cita desde el landing sin autenticación, mediante un diálogo que ofrece
iniciar sesión o continuar como invitado (solo nombre y correo).

### Qué se hizo

- **Endpoint público** `POST /api/booking` (`app/api/booking/route.ts`), sin autenticación:
  - Valida `bookingSchema` (nombre, correo, servicio, barbero, fecha).
  - Rechaza fechas pasadas y valida que el servicio y el barbero estén activos.
  - Busca al cliente por correo (normalizado); si no existe lo crea (reuso, no duplica).
  - Crea la cita con estado `PENDING` y `notes: "Reserva web (invitado)"`, reutilizando
    `createAppointment` del servicio (duración, precio y detección de conflicto 409).
- **Validación**: `bookingSchema` agregado a `lib/validations/index.ts`.
- **Diálogo** (`components/landing/booking-dialog.tsx`, client):
  - Se abre con el evento `barber:open-booking`; cierre con X, clic en backdrop y Escape;
    bloquea el scroll del body mientras está abierto.
  - Paso 1 (elección): "Reserva tu cita" → dos opciones con lenguaje claro:
    - "Continuar como invitado" — "Sin registro. Solo necesitas tu nombre y tu correo."
    - "Iniciar sesión" — acceso a `/login` para gestionar historial.
  - Paso 2 (invitado): formulario con nombre y correo (únicos datos personales) + selección de
    servicio (con precio y duración), barbero, fecha (mín. hoy) y hora (pasos de 30 min);
    validaciones en cliente (fecha futura) y errores del API mostrados en pantalla.
  - Paso 3 (éxito): resumen de la cita (servicio, barbero, fecha/hora, estado "Pendiente de
    confirmación").
- **Botones** (`components/landing/booking-button.tsx`, client): disparan el evento; reemplazan
  los CTAs "Reservar cita" (hero) y "Agendar cita" (banner) que antes iban a `/login`.

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/api/booking/route.ts` | nuevo (booking público) |
| `lib/validations/index.ts` | + `bookingSchema` |
| `components/landing/booking-dialog.tsx` | nuevo (diálogo 3 pasos) |
| `components/landing/booking-button.tsx` | nuevo (trigger) |
| `app/page.tsx` | CTAs → BookingButton + `<BookingDialog>` |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores (5 warnings preexistentes).
- `npm run build`: OK; `/api/booking` dinámico.
- Manual (curl): booking invitado crea cliente + cita `PENDING` (201); mismo barbero/hora →
  `409 APPOINTMENT_CONFLICT`; mismo correo → reusa el cliente (count=1).

### Riesgos / regresión

- El endpoint es público (por diseño); sin límite de uso/rate limit (pendiente según
  infraestructura, ver deuda).
- La creación cliente+cita no es transaccional (§32 pendiente).
- Zona horaria: el cliente envía `startsAt` en ISO (UTC); el manejo de zonas queda pendiente (§33).
- Las reservas de invitados aparecen en el panel como citas `PENDING` (visibles para el staff).

---

## 2026-08-20 · Cambio 9 — Registro de clientes en `/login`

### Objetivo

Ofrecer el registro para clientes en la página de login, creando cuentas con rol `CLIENT`
y manteniendo la separación entre staff y clientes.

### Qué se hizo

- **Schema + migración**: nuevo valor `CLIENT` en el enum `UserRole`
  (migración `add_client_role`, aplicada a Neon con URL directa).
- **Endpoints**:
  - `POST /api/auth/register` (nuevo): valida `registerSchema` (nombre, correo, contraseña ≥ 8),
    rechaza correo duplicado (409), crea `User(role=CLIENT)` + `Client` (find-or-create por correo,
    de modo que las reservas de invitado reutilizan el mismo cliente), crea sesión y devuelve `role`.
  - `POST /api/auth/login`: ahora devuelve `role` en la respuesta.
- **Seguridad por rol**:
  - `lib/permissions.ts`: `requireStaff()` (= ADMIN|OWNER|BARBER) para lecturas.
  - Las 5 lecturas de staff (`/api/services`, `/api/barbers`, `/api/clients`,
    `/api/appointments`, `/api/appointments/[id]`) pasan de `requireSession()` a `requireStaff()`
    → un `CLIENT` autenticado recibe `403 FORBIDDEN`.
  - `app/(dashboard)/layout.tsx`: si `session.role === "CLIENT"` redirige a `/` (sin portal aún).
- **UI** (`app/login/page.tsx`): pestañas "Iniciar sesión" / "Registrarse"; el registro pide
  nombre, correo y contraseña (mín. 8); tras éxito redirige por rol (`CLIENT` → `/`, staff → `/dashboard`).

### Archivos

| Archivo | Acción |
| --- | --- |
| `prisma/schema.prisma` | enum `UserRole` + `CLIENT` |
| `prisma/migrations/<ts>_add_client_role` | nueva migración |
| `app/api/auth/register/route.ts` | nuevo |
| `app/api/auth/login/route.ts` | respuesta con `role` |
| `lib/permissions.ts` | + `requireStaff()` |
| `app/api/{services,barbers,clients,appointments,appointments/[id]}` | lecturas con `requireStaff` |
| `app/(dashboard)/layout.tsx` | redirige `CLIENT` a `/` |
| `app/login/page.tsx` | pestañas + formulario de registro |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores (4 warnings preexistentes).
- `npm run build`: OK; `/api/auth/register` dinámico.
- Manual (curl): registro 200 (`role: CLIENT`), duplicado 409, contraseña corta 400; login
  devuelve `role`; con cookie CLIENT las lecturas staff devuelven 403; `/dashboard` redirige a `/`;
  admin sigue con acceso 200. Se creó `User(CLIENT)` + `Client` con el mismo correo.
- Requirió reiniciar el dev server (cliente Prisma regenerado no se recargaba en caliente).

### Riesgos / regresión

- Sin portal del cliente aún: un `CLIENT` autenticado solo puede usar el booking público
  (los CTAs del landing siguen funcionando sin sesión). Portal del cliente queda en deuda.
- El rol `CLIENT` no da acceso al panel; las páginas staff consultan la BD directo y dependen
  del redirect del layout para no exponerse.
- Los 4 warnings de lint restantes son preexistentes (sidebar/topbar/postcss).

---

## 2026-08-20 · Cambio 10 — Landing orientado a captar clientes

### Objetivo

Reorientar el copy del landing hacia el cliente final (personas que buscan corte, barba,
degradado), dejando atrás el tono de plataforma de gestión.

### Qué se hizo

- **Hero**: párrafo ahora enfocado en el cliente ("Cortes de cabello, barba y degradados de
  precisión, hechos a tu medida…"); se mantienen sellos (5.0, reserva en 2 min, estilo garantizado).
- **Servicios**: subtítulo → "Cortes, barba y más a precios claros en {currency}. Elige el tuyo
  y reserva tu lugar."
- **Experiencia**: features B2B ("Agenda impecable / Precios claros") → beneficios para el
  cliente: "Estilo con identidad" (Sparkles), "Barberos expertos" (Users), "Comodidad y
  puntualidad" (Clock); se elimina el icono `Banknote` no usado.
- **Nueva franja "Cómo reservar"**: 3 pasos numerados (Elige tu servicio → Elige barbero y
  horario → Confirma y listo).
- **CTA banner**: "Reserva tu lugar en minutos." + "Sin registros obligatorios, sin esperas.",
  botón renombrado a "Reservar cita".
- **Footer**: tagline → "Cortes, barba y estilo de primer nivel en un ambiente pensado para ti…".
- **Metadata**: description orientada al cliente (cortes/barba/degradados, reserva online).

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/page.tsx` | copy client-óntrico (hero, servicios, experiencia, CTA, footer, metadata) + franja 3 pasos |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores (4 warnings preexistentes).
- `npm run build`: OK.
- `GET /` (dev): 200, renderiza el nuevo copy.

### Riesgos / regresión

- Solo cambios de copy/estructura visual; sin cambios de datos, API ni lógica.
- El "Área de administración" del footer se mantiene como acceso discreto para staff.

---

## 2026-08-20 · Cambio 11 — Diálogo de reserva como wizard de 3 pasos

### Objetivo

Convertir el diálogo de reserva (Cambio 8) en un wizard guiado de 3 pasos, presentando
servicios y barberos en tarjetas seleccionables.

### Qué se hizo

`components/landing/booking-dialog.tsx` reestructurado con pasos `choice → services → confirm → success`:

- **Stepper**: indicador de progreso (1 Elige cómo · 2 Servicio · 3 Confirma) con estados
  pendiente/activo/completado (check dorado).
- **Paso 1 — "Reserva tu cita"**: se mantiene tal cual (elegir entre "Continuar como invitado"
  e "Iniciar sesión").
- **Paso 2 — Servicios**: tarjetas seleccionables (número dorado → check, nombre, duración,
  descripción y precio en `currency`); botón "Continuar" deshabilitado hasta seleccionar;
  botón "Volver".
- **Paso 3 — Confirmación**: nombre y correo (2 columnas) + **barberos en tarjetas**
  seleccionables (avatar de iniciales, nombre, especialidad, check) + fecha (mín. hoy) y hora
  (pasos 30 min) + botón "Confirmar reserva" (submit → `POST /api/booking`). El contenido del
  diálogo hace scroll interno (`max-h` + `overflow-y-auto`) para caber en `max-w-md`.
- **Éxito**: resumen de la cita (sin cambios).
- El panel ahora es desplazable; cierre por X/backdrop/Escape y bloqueo de scroll del body se
  mantienen.

### Archivos

| Archivo | Acción |
| --- | --- |
| `components/landing/booking-dialog.tsx` | reescrito como wizard 3 pasos |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores (4 warnings preexistentes).
- `npm run build`: OK.
- `GET /` (dev): 200; el diálogo se compila como client component (las interacciones son client-side).

### Riesgos / regresión

- Solo cambios de UI del diálogo; la API `/api/booking` y los datos no cambian.
- La selección de barbero/servicio ahora es por tarjeta (antes `<select>`); el estado de
  envío y la validación de fecha futura/conflicto siguen en el servidor.

---

## 2026-08-20 · Cambio 12 — Fix hydration en Topbar

### Objetivo

Eliminar el error de hidratación en `/appointments` y demás páginas del dashboard.

### Qué se hizo

`components/topbar.tsx` usaba `typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "dashboard"`
(anti-patrón que produce SSR/client mismatch: el servidor rendercaba "Panel general" y el cliente el título de la
ruta real). Se reemplaza por `usePathname()` de `next/navigation`, seguro para hidratación.

### Archivos

| Archivo | Acción |
| --- | --- |
| `components/topbar.tsx` | `usePathname()` en lugar de `window.location` |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores. `npm run build`: OK.
- `GET /appointments`: 307 (redirect a login), sin crash.

### Riesgos / regresión

- Ninguno: el título ahora proviene siempre del router (mismo valor en server y cliente).

---

## 2026-08-20 · Cambio 13 — Agenda por rango de fechas + botón y dialog de "Próximas citas"

### Objetivo

- La agenda de `/appointments` deja de filtrar por una sola fecha y permite un **rango desde/hasta**.
- El listado "Próximas citas" deja de ser un panel inline y pasa a un **botón trigger con contador**
  que abre un **dialog grande** con el detalle de las próximas citas pendientes/confirmadas.

### Qué se hizo

- **API** `app/api/appointments/route.ts`: el GET acepta `from` y `to` (YYYY-MM-DD) además de `date`
  (backward-compatible). Con `upcoming=1` sigue devolviendo PENDING/CONFIRMED futuras (máx. 8).
- **Página** `app/(dashboard)/appointments/page.tsx`:
  - Estado `from`/`to` (por defecto hoy → +6 días) en lugar de `date`; dos inputs de fecha "Desde/Hasta".
  - Nueva columna **Fecha** en la tabla (con rango multi-día).
  - Eliminado el panel inline de "Próximas citas"; botón trigger en el header con badge de conteo.
  - "Ver día" (desde el dialog) ajusta el rango a ese día concreto.
  - Se corrige el warning de lint "setState síncrono dentro del effect" (las dos cargas se hacen vía `.then()`).
- **Nuevo** `components/upcoming-appointments-dialog.tsx`: dialog grande (`max-w-3xl`, scroll interno,
  cierre X/backdrop/Escape, bloqueo de scroll del body) con tarjetas: badge de día/mes, hora, cliente,
  fecha larga, servicio, barbero, estado y acción "Ver día". Cuenta pendientes y permite actualizar.

### Archivos

| Archivo | Acción |
| --- | --- |
| `app/api/appointments/route.ts` | filtro por rango `from`/`to` |
| `app/(dashboard)/appointments/page.tsx` | rango de fechas + trigger + columna Fecha |
| `components/upcoming-appointments-dialog.tsx` | nuevo dialog grande de próximas citas |

### Verificación

- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores (4 warnings preexistentes).
- `npm run build`: OK.
- `GET /api/appointments?from=2026-08-20&to=2026-08-21` → 10 citas (4 + 6). `upcoming=1` sigue OK.

### Riesgos / regresión

- Solo cambios de UI/filtro; no cambia el modelo de datos ni los POST/PATCH.
- El dialog es un client component que consulta la misma API staff (`requireStaff`).

---

## 2026-08-20 · Cambio 14 — Fix crítico de autenticación (password check omitido)

### Objetivo

Corregir un fallo de seguridad grave detectado por los nuevos tests de integración (Cambio 15):
**cualquier contraseña daba acceso a cuentas existentes**.

### Qué se hizo

En `lib/auth.ts`, `authenticate()` evaluaba `!verify(password, user.passwordHash)` **sin `await`**:
`verify` es `async` y devuelve una `Promise` (objeto siempre truthy), por lo que `!verify(...)` era
siempre `false` y el chequeo de contraseña se saltaba por completo. Bastaba conocer el email.

```ts
// antes (bug)
if (!user || !user.active || !verify(password, user.passwordHash)) return null;
// después
if (!user || !user.active || !(await verify(password, user.passwordHash))) return null;
```

### Verificación

- `curl login admin@barberservice.local + "incorrecta"` → 401 (antes 200).
- `login + "Admin123!"` → 200.
- Suite de integración completa en verde.

### Riesgos / regresión

- Cambio de una línea; no afecta el registro (ya hacía `await hash(...)`).

---

## 2026-08-20 · Cambio 15 — Tests de integración API (§23)

### Objetivo

Cubrir con tests automatizados los flujos críticos de la spec §23 (API, autenticación, mutaciones)
sobre el server real + Prisma/Neon.

### Qué se hizo

- `vitest.integration.config.mts`: config dedicada (`tests/**/*.test.ts`, timeout 30s, alias `@`).
- `tests/api/helpers.ts`: `ApiClient` HTTP con cookie jar (login/register conservan sesión) y un
  `PrismaClient` para limpieza.
- `tests/api/flows.test.ts` (16 tests):
  - **Autenticación**: registro CLIENT (200), duplicado (409), contraseña corta (400), login staff
    (200 OWNER), credenciales inválidas (401), sin sesión (401), CLIENT en endpoint staff (403).
  - **Reservas**: crear reserva invitado (201, PENDING), fecha pasada (400), datos incompletos
    (400), doble reserva mismo barbero/hora (409), listado staff por día la incluye, confirmar y
    completar (PATCH 200), BARBER sin permiso de PATCH (403), cita inexistente (404).
- Cleanup en `afterAll`: borra citas/clientes/usuarios creados por los tests (emails únicos por
  ejecución con `Date.now()`).
- Script `test:integration` en `package.json`. Requiere dev server corriendo + `.env`.

### Archivos

| Archivo | Acción |
| --- | --- |
| `vitest.integration.config.mts` | nuevo |
| `tests/api/helpers.ts` | nuevo |
| `tests/api/flows.test.ts` | nuevo |
| `package.json` | script `test:integration` |

### Verificación

- `npm run test:integration`: 16/16. `npm test` (unit, service de citas): 17/17.
- El test de "credenciales inválidas" detectó el bug del Cambio 14 (login con password erróneo daba 200).

### Riesgos / regresión

- Los tests mutan la BD real (con limpieza automática); emails únicos evitan colisiones entre runs.
- No requiere framework de browser; los flujos críticos se cubren a nivel API (E2E browser queda
  como mejora futura).

---

## 2026-08-20 · Cambio 16 — Warnings de lint resueltos, typecheck y sidebar por rol

### Objetivo

- Cero warnings de lint (4 preexistentes).
- Script `typecheck` en `package.json`.
- Sidebar solo muestra las secciones permitidas por rol.

### Qué se hizo

- `components/sidebar.tsx`: se elimina el import `CircleDollarSign` sin uso; logout con
  `useRouter().push("/login")` en lugar de `window.location.assign(...)`; el menú se define por
  grupos con `roles` y se filtra por `session.role` (BARBER no ve Barberos/Servicios/Configuración;
  OWNER/ADMIN ven todo).
- `components/topbar.tsx`: se usa la prop `session` (antes sin uso) mostrando avatar con iniciales,
  nombre y rol del usuario.
- `postcss.config.mjs`: export nombrado en lugar de anónimo.
- `package.json`: nuevo script `typecheck` (`tsc --noEmit`).

### Archivos

| Archivo | Acción |
| --- | --- |
| `components/sidebar.tsx` | roles + router.push |
| `components/topbar.tsx` | usuario/rol visible |
| `postcss.config.mjs` | export nombrado |
| `package.json` | `typecheck` |

### Verificación

- `npm run lint`: 0 errores, 0 warnings. `npm run typecheck`: OK. `npm run build`: OK.

### Riesgos / regresión

- El sidebar ahora oculta secciones por rol; el servidor ya bloqueaba vía `requireRole`,
  así que solo se alinea la UI (sin cambio de seguridad real).

---

## Deuda técnica pendiente (orden sugerido)

1. API de pagos (`Payment` en schema, sin endpoint/UI) + registro de cobro atómico (`$transaction`,
   §32).
2. Timezone del negocio en cálculos de agenda (§33).
3. Middleware/proxy de protección de rutas en el edge (hoy las páginas se protegen vía layout).
4. E2E en browser (Playwright) de los flujos críticos (hoy cubiertos a nivel API).
5. Portal del cliente ("mis citas" para usuarios CLIENT) — fuera del alcance del spec actual.

---

## Convención para futuros cambios

Todo cambio de código debe añadir una entrada en este documento (`blueprint/CHANGELOG.md`) antes
de declararse terminado: alcance, archivos, decisiones, verificación y riesgos. Los cambios de
esquema deben producir su migración Prisma (§7) y reflejarse en el seed si corresponde (§36).