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
