# 📊 SPEC Específico — `/dashboard/visitantes` · Analíticas de Audiencia

> **Módulo:** Panel admistrativo (Dashboard)
> **Ruta:** `/[locale]/dashboard/visitantes`
> **Etiqueta sidebar:** "Visitantes" / "Visitors"
> **Acceso:** `ADMIN` (ver §7 Observaciones — hay divergencia con el RBAC global)
> **Fuente principal:** `SPEC TÉCNICO v2.1.md` + código actual en `src/app/[locale]/(admin)/dashboard/visitantes/page.tsx`

---

## 1. Propósito

Mostrar la **analítica de audiencia del sitio web público (landing)** de Hotel Río Yurubí:
tráfico, origen, geolocalización aproximada, dispositivo, páginas más vistas y el perfil
de los usuarios anónimos que navegan sin autenticación.

**Aviso clave:** los *visitantes* de este módulo **no** son usuarios del sistema
(no tienen rol en `User`). Son sesiones anónimas capturadas desde la landing. Por eso
no existen en la matriz de roles ni en la gestión de usuarios del backend.

---

## 2. Control de Acceso

Actual en el código:

```ts
const session = await auth();
if (!session || session.user?.role !== "ADMIN") {
  redirect(`/${locale}/login`);
}
```

| Ruta                          | ADMIN | OWNER | RECEPTIONIST |
| ----------------------------- | :---: | :---: | :---:        |
| `/dashboard/visitantes`        |  ✅  |  ❌   |     ❌       |
| `/dashboard/reportes`          |  ✅  |  ✅   |     ❌       |

> ⚠️ **Divergencia detectada:** la página usa un chequeo duro `role !== "ADMIN"` en
> lugar del helper `requirePermission("analytics:read")` de `src/lib/rbac.ts`. Según la
> matriz global, `OWNER` también posee `analytics:read`, pero **no** tiene enlace de
> navegación a "Visitantes" en `dashboard/layout.tsx` (ver §7).

---

## 3. Modelo de Datos (Prisma)

`.schema` → `prisma/schema.prisma` (sección "ANALÍTICAS DE VISITANTES").

### 3.1 `PageView` → `page_views`

| Campo       | Tipo      | Notas                                                      |
| ----------- | --------- | ---------------------------------------------------------- |
| `id`        | `String`  | cuid, PK                                                   |
| `sessionId` | `String`  | relación lógica con `VisitorSession.id` (sin FK)           |
| `path`      | `String`  | ruta visitada, ej. `/`, `/habitaciones`                    |
| `referrer`  | `String?` | URL de origen                                               |
| `country`   | `String?` | país aproximado (no exacto)                                 |
| `city`      | `String?` | ciudad aproximada                                           |
| `device`    | `String?` | `"mobile"` \| `"tablet"` \| `"desktop"`                    |
| `browser`   | `String?` |                                                             |
| `os`        | `String?` |                                                             |
| `duration`  | `Int?`    | segundos en la página                                        |
| `isOrganic` | `Boolean` | true si no hay referrer o el referrer es buscador            |
| `createdAt` | `DateTime`| default `now()`                                             |

Índices: `@@index([path])`, `@@index([sessionId])`, `@@index([createdAt])`.

### 3.2 `VisitorSession` → `visitor_sessions`

| Campo        | Tipo       | Notas                                                    |
| ------------ | ---------- | -------------------------------------------------------- |
| `id`         | `String`   | cuid, PK                                                 |
| `fingerprint`| `String?`  | hash anónimo, `@unique` → **NO** guarda datos personales  |
| `country`    | `String?`  |                                                           |
| `city`       | `String?`  |                                                           |
| `device`     | `String?`  |                                                           |
| `browser`    | `String?`  |                                                           |
| `os`         | `String?`  |                                                           |
| `referrer`   | `String?`  |                                                           |
| `isOrganic`  | `Boolean`  | default `false`                                            |
| `pagesViewed`| `Int`      | default `1`                                                |
| `duration`   | `Int`      | segundos totales, default `0`                              |
| `bounced`    | `Boolean`  | default `true` → salió sin navegar                         |
| `firstSeen`  | `DateTime` | default `now()`                                            |
| `lastSeen`   | `DateTime` | default `now()`                                            |

Índices: `@@index([firstSeen])`, `@@index([country])`, `@@index([isOrganic])`.

---

## 4. Parámetros de Entrada

`page.tsx` recibe:

- `params: Promise<{ locale: string }>`
- `searchParams: Promise<{ startDate?: string; endDate?: string }>`

Los filtros vienen del `ReportFilterBar` (fechas en formato `yyyy-MM-dd`):

- `startDate` → `startOfDay(new Date(startDate))`
- `endDate` → `endOfDay(new Date(endDate))`

**Periodo por defecto (sin filtros):** mes en curso
(`startOfMonth`–`endOfMonth` de `today`).

---

## 5. KPIs (Cards)

Se consultan en un solo `Promise.all`:

| KPI                     | Query                                              | Sub-label (ES)                |
| ----------------------- | -------------------------------------------------- | ----------------------------- |
| Visitas Totales         | `visitorSession.count({ where })`                  | "Este mes" / "En el periodo"  |
| Usuarios Orgánicos      | `count({ ...where, isOrganic: true })`             | "Sin referrer directo / redes"|
| Tasa de Rebote          | `count({ ...where, bounced: true }) ÷ total × 100` | "Salieron sin navegar"        |
| Promedio Permanencia    | `aggregate({ _avg: { duration } })`                | "Tiempo activo"               |

Fórmulas derivadas:

```ts
bounceRate = totalVisitors > 0 ? Math.round((bouncedVisitors / totalVisitors) * 100) : 0;
avgFormat  = avgDur > 60 ? `${m}m ${s}s` : `${Math.floor(avgDur)}s`;
```

> Nota: `bouncedVisitors` se cuenta dentro del **mismo periodo filtrado**, pero
> `activeSessionsToday` usa `lastSeen >= subDays(today, 1)` (≈ sesiones activas en las
> últimas 24 h, no "hoy" en sentido estricto). Ver §7.

---

## 6. Visualizaciones

### 6.1 Resumen de Tráfico (gráfica de área) — `VisitorsOverviewChart`

- **Componente:** `src/components/dashboard/analytics/VisitorsOverviewChart.tsx` (cliente, `react-apexcharts`, `ssr:false`).
- **Datos:** últimos 30 días **siempre** (ignora el filtro de fechas a propósito para
  conservar el histórico).
- Se hace `findMany` de `VisitorSession` de los últimos 30 días y se agrega (total /
  orgánico) por día en JS usando un `Map` pre-inicializado.
- **Series:** `Total Visitas` (azul `#0c88ee`, contínua) y `Orgánicas`
  (verde `#22c55e`, discontinua).
- Encabezado: badge "N activas hoy" usando `activeSessionsToday`.

### 6.2 Páginas Más Vistas (barras horizontales) — `TopSectionsChart`

- **Componente:** `src/components/dashboard/analytics/TopSectionsChart.tsx` (cliente, apexcharts).
- **Datos:** `pageView.groupBy({ by: ["path"] })` ordenado desc, `take: 10`.
- **Alcance temporal:** si hay filtros de fecha usa `createdAt` en el rango; si **no** hay
  filtros el `where` es `undefined` → **cuenta todo el histórico**, NO solo el mes en curso
  (inconsistente con el resto de KPIs). Ver §7.
- Color de barras: morado `#8b5cf6`.

### 6.3 Tabla de Sesiones — `VisitorsTable`

- **Componente:** `src/components/dashboard/analytics/VisitorsTable.tsx` (cliente).
- **Datos:** `visitorSession.findMany` con `take: 500` (límite de rendimiento).
- **Columnas:** Fecha/Hora, Ubicación (país/ciudad), Dispositivo (+ navegador), Fuente,
  Páginas, Tiempo.
- **Búsqueda:** por país, ciudad o referrer.
- **Filtros:** dispositivo (`ALL/desktop/mobile/tablet`) y tipo de tráfico
  (`ALL/ORGANIC/DIRECT/REFERRAL`).
  - `ORGANIC` → `isOrganic`
  - `DIRECT` → `!referrer`
  - `REFERRAL` → `!isOrganic && !!referrer`
- **Orden:** por Fecha/Hora, Ubicación, Dispositivo, Páginas, Tiempo.
- **Paginación:** cliente (`TablePagination`), tamaño por defecto 10.
- **Badge de fuente:** Orgánico (verde) / Directo (gris) / hostname del referrer.

---

## 7. Observaciones / Divergencias encontradas en la revisión

1. **Permiso duro vs. RBAC:** la página valida `role !== "ADMIN"`, pero el sistema define
   `analytics:read` que también cubre a `OWNER`. Uso recomendado:
   `requirePermission("analytics:read")` de `src/lib/rbac.ts`. Además `OWNER` no tiene
   enlace "Visitantes" en `layout.tsx`, así que aunque se le diera acceso no podría navegar.
2. **`topPages` ignora el periodo por defecto:** sin `startDate`/`endDate` el `where` es
   `undefined` → cuenta vistas de **siempre**, mientras KPIs y tabla usan el mes en curso.
3. **`activeSessionsToday`:** usa `subDays(today, 1)` (24 h), no estrictamente "hoy".
4. **`take: 500` en sesiones:** la tabla se limita a 500 registros aunque haya más en el
   periodo; la paginación opera sobre ese subset cargado (no es paginación server-side).
5. **Gráfica de 30 días + agregación en JS:** trae todas las sesiones del periodo y agrega
   en memoria (loop de 30 queries evitado, pero aún costoso con mucho volumen; ideal
   `groupBy`/raw SQL por día).
6. **`new URL(session.referrer)` en `VisitorsTable`:** lanzaría error si el referrer es
   una cadena inválida (no se valida en runtime mediante try/catch).
7. **`avgDurationAggr._avg.duration`** es tipado `number | null`; se usa `|| 0` correctamente.
8. **Ruta no documentada en el SPEC maestro:** la tabla "9.2 Rutas del Dashboard" lista
   `/dashboard/reportes` pero **no** `/dashboard/visitantes`. Considerar añadir la fila
   correspondiente (permiso `analytics:read`).

---

## 8. Checklist de implementación (page.tsx)

- [ ] `metadata.title` → "Analítica de Visitantes | Admin Dashboard".
- [ ] Guard de sesión con redirect a `/{locale}/login`.
- [ ] `Promise.all` de KPIs vs. periodo filtrado o mes en curso.
- [ ] Filtros `startDate`/`endDate` declarados en `searchParams`.
- [ ] `overviewData` de 30 días vía `Map<yyyy-MM-dd, {total, organic}>`.
- [ ] `topSectionsData` con `path = raw.split("?")[0] || "/"`.
- [ ] Render: header + `ReportFilterBar`, KPI grid (4 cards), charts row, tabla de sesiones.
- [ ] Traducciones ES/EN en labels (`isEs`).

---

## 9. Archivos relacionados

| Archivo                                   | Rol                          |
| ----------------------------------------- | ---------------------------- |
| `src/app/[locale]/(admin)/dashboard/visitantes/page.tsx` | Server Component / orquestador |
| `src/components/dashboard/analytics/VisitorsOverviewChart.tsx` | Gráfica área (cliente) |
| `src/components/dashboard/analytics/TopSectionsChart.tsx`   | Barras top páginas (cliente) |
| `src/components/dashboard/analytics/VisitorsTable.tsx`      | Tabla de sesiones (cliente) |
| `src/components/dashboard/ReportFilterBar.tsx`              | Selector de periodo (cliente) |
| `prisma/schema.prisma`                      | Modelos `PageView`, `VisitorSession` |
| `src/lib/rbac.ts`                           | Helper de permisos (recomendado) |
| `src/app/[locale]/(admin)/dashboard/layout.tsx` | Nav "Visitantes" (ADMIN) |
