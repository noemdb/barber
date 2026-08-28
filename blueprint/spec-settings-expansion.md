# Plan Integral — Expansión del módulo de configuración del negocio (Settings)

## 1. Resumen ejecutivo

Ampliar el módulo `/settings` (hoy de solo lectura) a un **panel de administración completo**
que gestiona la identidad, contacto, marca, imágenes, horarios y testimonios de la barbería,
para que **toda la información del dashboard y del landing sea editable** sin tocar código.

**Alcance**

- Convertir `app/(dashboard)/settings/page.tsx` en un formulario editable (client component).
- Ampliar el modelo `BusinessSettings` con campos de marca, contacto, redes y hero.
- Crear 2 modelos normalizados: `BusinessHour` (horarios por día) y `Testimonial`.
- Crear la API `GET/PATCH /api/settings` con validación `zod` y control de acceso.
- Consumir estos datos en el landing (`app/page.tsx`) y el shell (`nav`, `topbar`, `sidebar`, `footer`).
- Asegurar que la zona horaria editable invalide el cache (`lib/time.ts`).

**Criterios de éxito**

1. `GET /api/settings` devuelve configuración + horarios + testimonios validados.
2. `PATCH /api/settings` persiste cambios y solo lo puede ejecutar un rol `OWNER`/`ADMIN`.
3. Al cambiar `timezone`, se llama a `resetBusinessTimezoneCache()` y las fechas se recalculan.
4. El landing y el dashboard consumen `businessName`, logo, hero y horarios de `BusinessSettings`
   (sin valores hardcodeados en `app/page.tsx`, `sidebar.tsx`, `topbar.tsx`, `nav.tsx`).
5. `npm run lint`, `npm run typecheck` y `npm run build` finalizan sin errores.

---

## 2. Modelo de datos ampliado

### 2.1. `BusinessSettings` — campos escalares (se amplía la tabla existente)

| Campo (columna) | Tipo | Descripción | Default |
| --- | --- | --- | --- |
| `id` | `String @id @default(cuid())` | PK. El seeder usa el id fijo `"settings"` | cuid |
| `businessName` | `String @default("Barber Shop Central")` | Nombre visible | hardcode |
| `logoUrl` | `String?` | Logo/marca (nav, sidebar, footer, tickets) | `null` |
| `faviconUrl` | `String?` | Favicon del navegador (fallback `/icon.svg`) | `null` |
| `tagline` | `String?` | Eyebrow del hero ("Barbería premium") | `null` |
| `heroImageUrl` | `String?` | Imagen del hero (fallback a la PNG pública actual) | `null` |
| `description` | `String?` | Meta description + párrafo hero | `null` |
| `phone` | `String?` | Teléfono (contacto y `tel:`) | `null` |
| `email` | `String?` | Correo (contacto y `mailto:`) | `null` |
| `whatsapp` | `String?` | Número de WhatsApp (CTA directo) | `null` |
| `address` | `String?` | Dirección física | `null` |
| `mapsUrl` | `String?` | URL de Google Maps (enlace "Ver en el mapa") | `null` |
| `instagramUrl` | `String?` | Perfil de Instagram | `null` |
| `facebookUrl` | `String?` | Página de Facebook | `null` |
| `currency` | `String @default("USD")` | Moneda de precios | `USD` |
| `timezone` | `String @default("America/Caracas")` | Zona horaria del negocio | hardcode |
| `appointmentSlot` | `Int @default(30)` | Paso de agenda (min) | `30` |
| `createdAt` / `updatedAt` | `DateTime` | Auditoría | now |

> Decisiones: la marca y contacto son **escalares** (1:1 con el negocio) porque se consultan
> casi siempre juntos y son de alta cardinalidad 1. Las estructuras repetitivas (horarios,
> testimonios) se normalizan para permitir CRUD tipado y orden editorial.

### 2.2. `BusinessHour` — nuevo (horarios laborables)

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @id @default(cuid())` | PK |
| `businessId` | `String` | FK → `BusinessSettings` (relation `hours`) |
| `dayOfWeek` | `Int` | 0=Domingo … 6=Sábado (`@@unique([businessId, dayOfWeek])`) |
| `openTime` | `String?` | `"HH:mm"` (24h). `null` + `closeTime: null` = cerrado |
| `closeTime` | `String?` | `"HH:mm"` |
| `createdAt` / `updatedAt` | `DateTime` | Auditoría |

- Un negocio tiene <7 filas (una por día abierto). Los días ausentes son "Cerrado".
- Se guardan como `"HH:mm"` (string validado con zod) para evitar ambigüedad de DST/parseo.
- `@@index([businessId])`.

### 2.3. `Testimonial` — nuevo

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | `String @id @default(cuid())` | PK |
| `businessId` | `String` | FK → `BusinessSettings` (relation `testimonials`) |
| `author` | `String` | Nombre del cliente |
| `role` | `String?` | Ej.: "Cliente frecuente" |
| `quote` | `String` | Texto del testimonio |
| `rating` | `Int @default(5)` | 1–5 estrellas |
| `order` | `Int @default(0)` | Orden editorial (asc) |
| `createdAt` / `updatedAt` | `DateTime` | Auditoría |

- `@@index([businessId, order])`.

### 2.4. Migración

Nueva migración que:

1. `ALTER TABLE "BusinessSettings" ADD COLUMN` para cada campo nuevo (nullable o con default).
2. `CREATE TABLE "BusinessHour"` y `CREATE TABLE "Testimonial"` con constraints de FK.
3. `UPDATE "BusinessSettings" SET "id"='settings' WHERE ...` (asegurar singleton, si aplica).
4. No destructiva: columnas nuevas nullable/`DEFAULT` → no rompe datos existentes.

---

## 3. Decisiones de diseño

### 3.1. Forma de la API

- **`GET /api/settings`** → `{ success, data: { settings, businessHours, testimonials } }`.
  Lectura para el formulario admin. El landing y el dashboard siguen leyendo con `prisma`
  en server components (sin round-trip), para no perder `force-dynamic` ni caching.
- **`PATCH /api/settings`** → recibe el payload completo del formulario:
  ```ts
  {
    businessName?, logoUrl?, faviconUrl?, tagline?, heroImageUrl?, description?,
    phone?, email?, whatsapp?, address?, mapsUrl?, instagramUrl?, facebookUrl?,
    currency?, timezone?, appointmentSlot?,
    businessHours: Array<{ dayOfWeek: number; openTime: string|null; closeTime: string|null }>,
    testimonials: Array<{ author: string; role: string|null; quote: string; rating: number; order: number }>,
  }
  ```
  Semántica **reemplazo total** dentro de una transacción: upsert del singleton → `deleteMany` +
  `createMany` de `hours` y `testimonials`. Robusto y simple.

### 3.2. Validación

- `zod` (ya en deps) un espacio de esquemas reutilizable en `lib/settings.schema.ts`.
  - `timezone`: validar contra `Intl.supportedValuesOf("timeZone")` (fallback no bloqueante).
  - `currency`: validar contra `Intl.supportedValuesOf("currency")`.
  - `openTime`/`closeTime`: regex `^([01]\d|2[0-3]):[0-5]\d$`; si uno viene, ambos deben venir.
  - `dayOfWeek`: 0–6, sin duplicados.
  - `rating`: 1–5; `appointmentSlot`: 5–240.
  - URLs: `iurl` (https) cuando no estén vacías.

### 3.3. Control de acceso

- `GET`: cualquier sesión autenticada con permisos de dashboard (`requireSession`).
- `PATCH`: `requireRole("OWNER", "ADMIN")` (reutilizar `lib/permissions.ts`).
  El sidebar ya oculta Settings a `BARBER`; la API es la barrera dura.

### 3.4. Cache de zona horaria

- `lib/time.ts` ya cachea `getBusinessTimezone()` en una variable de módulo.
- Tras un `PATCH` que cambie `timezone`, llamar a `resetBusinessTimezoneCache()` explícitamente.
- Nota: la función existe pero **nadie la usa hoy**; este paso la activa.

### 3.5. Uploads de marca/hero

- Reutilizar UploadThing. Añadir endpoint `brandingUploader` en
  `app/api/uploadthing/core.ts` (imagen, `maxFileSize: "4MB"` — los logos/hero pesan más) con el
  mismo middleware `requireRole("ADMIN","OWNER")` y filtro de tipos.
- El formulario usa `<UploadButton>` con la URL devuelta en `file.ufsUrl`.

### 3.6. Estrategia de filtrado (branding opcional)

- Todo campo de marca es `nullable`. El componente renderiza el **fallback visual actual**
  (PNG hero, logo de tijeras SVG, favicon `/icon.svg`) cuando el valor es `null`.
- Así nunca se rompe el layout si el negocio no sube imágenes.

---

## 4. Plan de implementación

### Fase 1 — Migración de datos

1. **`prisma/schema.prisma`**: ampliar `BusinessSettings` (2.1) y añadir `BusinessHour` y
   `Testimonial` (2.2/2.3) con sus relaciones y `@@index`.
2. **`prisma/migrations/*_expand_settings/migration.sql`**: crear/alterar tablas (no destructiva).
3. **`prisma/seed.ts`**: actualizar el `upsert` del singleton para poblar los nuevos campos
   (`logoUrl`, `heroImageUrl`, `description`, `whatsapp`, `mapsUrl`), los `BusinessHour`
   (Lun–Vie 08:00–18:00, Sáb 09:00–17:00, Dom cerrado) y 3 `Testimonial`. Mantener idempotencia
   (según el patrón actual: solo crear si no existen).

### Fase 2 — API `settings`

4. **`lib/settings.schema.ts`** (nuevo): esquemas zod + tipos inferidos.
5. **`app/api/settings/route.ts`** (nuevo):
   - `GET`: `requireSession()` + `findFirst` + `hours`/`testimonials` (orden).
   - `PATCH`: `requireRole("OWNER","ADMIN")`, parseo zod, transacción de reemplazo,
     `resetBusinessTimezoneCache()` si cambia `timezone`. Devuelve el payload actualizado.
6. **`lib/time.ts`**: no requiere cambios (ya tiene `resetBusinessTimezoneCache`).
7. **`app/api/uploadthing/core.ts`**: añadir `brandingUploader`.

### Fase 3 — UI del shell (consumo de datos dinámicos)

8. **`lib/settings-getters.ts`** (nuevo, opcional) o directo: helper servidor que devuelve
   settings + hours + testimonials tipados y con fallbacks, para evitar repetir `findFirst`.
9. **`app/page.tsx`**: usar `settings.heroImageUrl` (fallback PNG), `settings.tagline` (eyebrow),
   `settings.description`, `settings.mapsUrl`/`whatsapp` (CTA), horarios dinámicos en el footer,
   testimonios de la DB en lugar del array hardcodeado. Pasar fallbacks seguros.
10. **`components/landing/nav.tsx`**: aceptar `logoUrl` opcional y renderizar imagen en vez del
    placeholder de tijeras si existe.
11. **`components/sidebar.tsx`** y **`components/topbar.tsx`**: usar `businessName` de
    `BusinessSettings` (hoy hardcodeado "Barber Shop Central") y `logoUrl` si está definido.
    Regresión mínima: leer `settings` en el layout del dashboard y pasarlos por props.

### Fase 4 — Formulario de `/settings`

12. **`app/(dashboard)/settings/page.tsx`**: convertir a client component. Cargar con
    `GET /api/settings` en `useEffect`, guardar con `PATCH /api/settings` (con `toast` de
    sonner y estado de guardado). Secciones en cards:
    - *Identidad*: nombre, tagline, descripción.
    - *Imágenes*: logo, favicon, hero (`UploadButton` + vista previa).
    - *Contacto*: teléfono, whatsapp, email, dirección, `mapsUrl`, Instagram, Facebook.
    - *Operación*: moneda, zona horaria, intervalo de agenda.
    - *Horarios*: editor por día (7 filas, toggle abierto/cerrado, hora apertura/cierre).
    - *Testimonios*: lista con autor, rol, estrellas, texto, reordenar/subir/bajar y agregar.
13. **`components/settings/business-hours-editor.tsx`** (nuevo): sub-componente reutilizable.
14. **`components/settings/testimonials-editor.tsx`** (nuevo): sub-componente reutilizable.
15. **`app/(dashboard)/layout.tsx`**: pasar `businessName`/`logoUrl` a `Sidebar`/`Topbar`.

### Fase 5 — QA

16. Verificar manualmente `/settings` en ambos temas (formulario + guards).
17. Probar permisos: intentar `PATCH` como `BARBER` o `CLIENT` → `403`.
18. Editar `timezone` y confirmar que el dashboard recalcula fechas (reseteo de cache).
19. `npm run lint`, `npm run typecheck`, `npm run build`.
20. Medir contraste en el formulario (dark/light consistency con `spec-dark-mode.md`).

---

## 5. Convenciones de código

- Seguir el patrón de componentes existentes (clases Tailwind con `dark:` — ver
  `blueprint/spec-dark-mode.md` sección 4).
- Formularios tipo-controlled con `useState`; nunca `style={{ color }}` en línea.
- Errores de API con `DomainError`/`ErrorCodes` (ver `lib/errors.ts`) y `toast.error`.
- `zod` como única fuente de validación de entrada (no duplicar checks manuales).
- Rutas API: `success: boolean`, `data`, `error: { code, message }` (consistente con el resto).
- Uploads solo vía UploadThing; nunca aceptar URLs arbitrarias sin configurar en `core.ts`.
- Testimonios y horarios se guardan completos (reemplazo total); el cliente envía el estado final.

---

## 6. Estructura de archivos nuevos y modificados

```
prisma/
  schema.prisma                        (modificado: BusinessSettings + BusinessHour + Testimonial)
  migrations/<ts>_expand_settings/     (nuevo: migration.sql)
  seed.ts                              (modificado: poblar campos, horas, testimonios)
lib/
  settings.schema.ts                   (nuevo: zod + tipos)
  time.ts                              (sin cambios — ya expone resetBusinessTimezoneCache)
app/
  api/
    settings/route.ts                  (nuevo: GET/PATCH)
    uploadthing/core.ts                (modificado: brandingUploader)
  page.tsx                             (modificado: hero, contacto, footer, testimonios dinámicos)
  (dashboard)/
    layout.tsx                         (modificado: pasar businessName/logoUrl)
    settings/page.tsx                  (reescrito: formulario client)
components/
  landing/nav.tsx                      (modificado: logoUrl opcional)
  sidebar.tsx                          (modificado: businessName/logoUrl dinámicos)
  topbar.tsx                           (modificado: businessName dinámico)
  settings/
    business-hours-editor.tsx          (nuevo)
    testimonials-editor.tsx            (nuevo)
blueprint/
  CHANGELOG.md                         (modificado: entrada Cambio 21)
```

> Los server components (`dashboard/page.tsx`, `appointments/*`, `clients`, `barbers`,
> `services`) **no** cambian de comportamiento; solo `settings/page.tsx` pasa a client.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Campos nullable rompen el landing | Fallback visual igual al actual (PNG hero, SVG logo, `/icon.svg`). |
| Cambio de `timezone` da fechas erróneas | `resetBusinessTimezoneCache()` tras el PATCH. |
| `PATCH` por roles indebidos | `requireRole("OWNER","ADMIN")` en la API (barrera dura). |
| Datos inválidos (hora, moneda, tz, URLs) | `zod` en `lib/settings.schema.ts` con errores tipados. |
| Horarios solapados / inconsistentes | Validar por `dayOfWeek` único y pares openTime/closeTime. |
| Migración no destructiva | Columnas nullable con defaults; reusar el id singleton `"settings"`. |
| Testimonios con HTML/espacios raros | `zod` (`.trim()`, límite de longitud) + render como texto plano (no `dangerouslySetInnerHTML`). |
| Imágenes pesadas degradan el landing | UploadThing con `maxFileSize: "4MB"` y reuso del `updateImage` con `next/image` optimizado. |
| El formulario se queda sin datos si la API falla | Estado de carga + fallbacks + `toast.error`. |

---

## 8. Pruebas manuales

1. Recargar `/settings` y ver el formulario con los valores actuales.
2. Cambiar `businessName` y confirmar que el sidebar/topbar/footer/nav del landing se actualizan.
3. Subir un logo/hero y ver la vista previa; comprobar que el landing lo muestra.
4. Editar horarios (abrir/cerrar días) y ver el footer del landing actualizado.
5. Agregar/quitar/reordenar testimonios y ver la sección "Lo que dicen" reflectada.
6. Cambiar `timezone` y verificar que `/dashboard` recalcula la fecha de "hoy".
7. Probar `PATCH` como `BARBER` → `403`; como `OWNER` → `200`.
8. Probar ambos temas (dark/light) en el formulario.
9. Ejecutar `npm run lint`, `npm run typecheck`, `npm run build`.

---

## 9. Tareas de seguimiento

Cada paso numerado en la sección 4 (Fase 1 → 5) se registra como `TaskCreate` antes de
empezar. Marcar `in_progress` al iniciar y `completed` al validar con lint + typecheck + build.

---

## 10. Cierre

Una vez aprobado el plan, ejecutar las fases en orden. La Fase 1 (migración) es bloqueante.
Fases 2 y 3 se pueden paralelizar (API vs consumo en landing/shell). Fase 4 depende de Fase 2
(form escribe vía API). Fase 5 cierra con QA. Este cambio queda documentado como
`Cambio 21` en `blueprint/CHANGELOG.md` siguiendo el formato existente.
