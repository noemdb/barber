# Plan Integral — Sistema de roles por interfaz (admin / barber / client)

## 1. Resumen ejecutivo

Hoy el login redirige genéricamente: `CLIENT` → landing `/`, el resto → `/dashboard`.
El `enum UserRole` ya existe (`OWNER`, `ADMIN`, `BARBER`, `CLIENT`), pero las reglas de
acceso están **dispersas** (duplicadas en `components/sidebar.tsx`, `proxy.ts`,
`app/(dashboard)/layout.tsx` y `app/login/page.tsx`) y no existe una **interfaz propia para
barbero ni para cliente**. Cada navbar hardcodea su lista de roles.

**Objetivo**: establecer las **bases deterministas de un sistema de roles** con una **única
fuente de verdad** para (a) mapear rol → home, (b) decidir qué rol puede acceder a qué ruta,
(c) redirigir a cada usuario a **su interfaz correspondiente** tras el login, y (d) **acotar
cada interfaz a los datos propios del usuario autenticado** (citas, clientes, indicadores y
registros/bitácora vinculados a su cuenta).

**Alcance**

- Crear `lib/roles.ts` (edge-safe, sin Prisma/cookies) como fuente de verdad: grupos de rol,
  mapa `ROLE_HOME`, mapa `ROUTE_RULES` y helpers `homeForRole()` / `canAccess()`.
- Centralizar el guard de redirect en `requireRole`/nuevo `requireRedirect`, y conectar:
  `app/login/page.tsx`, `proxy.ts`, `app/(dashboard)/layout.tsx`, y los nuevos layouts de
  barber y client.
- Crear las **interfaces** de barbero (`/barber`) y de cliente (`/reservations`) como route
  groups con su propio layout, shell y página home, **acotadas a los datos propios** del usuario.
- Refactorizar `components/sidebar.tsx` para derivar la visibilidad de la matriz central
  (eliminar roles hardcodeados por ítem).

**Criterios de éxito**

1. `npm run lint`, `npm run typecheck`, `npm run build` finalizan sin errores.
2. Login redirige por rol: `OWNER`/`ADMIN` → `/dashboard`, `BARBER` → `/barber`,
   `CLIENT` → `/reservations` (verificado en `app/login/page.tsx` y `proxy.ts`).
3. Un usuario que forcea una ruta que su rol no puede ver termina en su **home** (defensa en
   `proxy.ts` + layouts), nunca en un 404 ni en una pantalla que no le corresponde.
4. `lib/roles.ts` es la única fuente de asignación rol→ruta; el Sidebar la consume y ya no
   repite arrays de roles.
5. Cada celda de la matriz se cumple en servidor (`requireRole`/`requireRoleOrRedirect`) y,
   cuando aplique, en el UI.
6. `config.matcher` de `proxy.ts` incluye **todas** las claves raíz de `ROUTE_RULES`
   (`/barber`, `/reservations`), y el test anti-loop verifica
   `isRoleAllowed(ROLE_HOME[role], role) === true` para cada rol (sin bucles de redirección).

---

## 2. Estado actual (contexto)

| Ubicación | Q hace hoy | Problema |
| --- | --- | --- |
| `lib/auth.ts` | JWT `{ sub, role, name, email }` vía jose, cookie `barberservice_session` | El JWT congeló el rol al iniciar sesión. |
| `lib/permissions.ts` | `requireRole(...roles)`, `requireStaff()`, `requireSession()` | Correcto, pero no centraliza home ni rutas. |
| `proxy.ts` (Next 16 → middleware) | Si no hay token → `/login`. Si `role === "CLIENT"` → `/`. Ruta protegida hardcodeada. | Solo entiende "CLIENT vs resto"; no distingue `BARBER`; redirige a `/` en lugar del home del rol. |
| `app/(dashboard)/layout.tsx` | `if (!session) redirect("/login"); if (role === "CLIENT") redirect("/")`. Carga `appointmentsToday`, `settings`. | Rechaza solo a CLIENT; un BARBER entra al console admin. |
| `components/sidebar.tsx` | Cada `NavItem` declara `roles: string[]`. | Roles duplicados; no hay "mi interfaz". |
| `app/login/page.tsx` | `window.location.assign(role === "CLIENT" ? "/" : "/dashboard")` | Misma lógica duplicada en cliente. |
| `app/api/auth/register/route.ts` | Crea usuario con `role: "CLIENT"` + `Client` por email | Correcto; solo falta a quién redirigir. |
| `app/api/booking/route.ts` | Crea `Client` por email (invitado) | Coherente con `Client.email`. |

Modelos relevantes: `User.role` (enum), `Barber.userId` (FK a `User`, ya usada por el seed),
`Client` (sin FK a `User`; se empareja por `email`).

---

## 3. Modelo de roles y de datos

### 3.1. Grupos de rol (sin cambios de schema)

No se toca el enum. Se definen **grupos** en `lib/roles.ts`:

| Grupo | Roles | Home | Interfaz |
| --- | --- | --- | --- |
| `ADMIN_GROUP` | `OWNER`, `ADMIN` | `/dashboard` | Consola de administración |
| `BARBER_GROUP` | `BARBER` | `/barber` | Portal del barbero |
| `CLIENT_GROUP` | `CLIENT` | `/reservations` | Portal del cliente |

### 3.2. Empaquetamiento `User ↔ Barber`

Ya existe `Barber.userId` (unique, `onDelete: SetNull`). El portal del barbero resuelve su
registro con `prisma.barber.findUnique({ where: { userId: session.sub } })`. No requiere
migración.

### 3.3. `User ↔ Client`

`Client` **no** tiene FK a `User`. Se resuelve por `email` (patrón ya usado en booking).
Opción marginal: añadir `Client.userId String? @unique` + migration en la **Fase 3** si se
quiere robustez ante cambios de correo. Se documenta como cambio menor y opcional, **no
bloqueante** para esta iteración.

> **Nota (unicidad):** `Client.email` es `String?` **sin** `@unique` en el schema (el único
> `@unique` de email está en `User`). Por tanto `getCurrentClient` **no** debe usar
> `findUnique({ where: { email } })` (no compila); se usa `findFirst({ where: { email } })`.
> Como puede existir más de un `Client` con el mismo correo, y para robustez ante cambios de
> correo, se adopta como **decisión por defecto**:
> - Resolver el `Client` propio con `findFirst({ where: { email }, orderBy: { createdAt: "asc" } })`
>   (primero creado) para esta iteración.
> - Dejar documentada la migración opcional `Client.userId String? @unique` como refuerzo
>   recomendado en Fase 3 (no bloqueante).

### 3.4. Alcance de datos por rol (quién ve qué)

Regla transversal: **cada rol solo ve lo que le pertenece**. La consola admin (`OWNER`/`ADMIN`)
ve **todo**; `BARBER` y `CLIENT` ven **solo su propio subconjunto**. El acotado se resuelve en
la capa de datos (Prisma) del servidor, nunca confiando en el fetch del cliente.

| Vista | OWNER / ADMIN | BARBER | CLIENT |
| --- | --- | --- | --- |
| Citas | Todas | `Appointment.barberId === barber.id` (resuelto por `User.barber.userId`) | `Appointment.client.email === session.email` |
| Clientes | Todos | Clientes que tienen citas con él (`distinct` sobre sus citas) | Solo su perfil (derivado de su `Client.email`) |
| Indicadores (dashboard) | Globales | Agregados **solo** de sus citas/ingresos | Agregados solo de sus reservas |
| Bitácora / registros | Todos | Entradas donde `subjectId === session.sub` **o** `createdBy === session.sub` (ya implementado en `app/api/binnacle/route.ts`) | Entradas donde `subjectId === session.sub` (sus eventos de autenticación/reserva) |
| Servicios / barberos / configuración | Todos | No (solo la tabla de barberos puede ser de solo-lectura si se desea) | No |

Resolución del registro propio:

- **Barbero**: `session.sub` → `barber` vía `prisma.barber.findUnique({ where: { userId: session.sub } })`.
  Si `userId` es `null` → el portal muestra "perfil sin vincular" (no 500).
- **Cliente**: `session.email` → `client` vía `prisma.client.findFirst({ where: { email } })`
  (email no es único; ver §3.3).
  La cita se considera propia si `appointment.client.email === session.email` (patrón `booking`).

> Nota: el filtro de `BARBER` en la bitácora **ya está implementado** en `lib/permissions`/
> `app/api/binnacle/route.ts` (ramas `subjectId`/`createdBy`). Se reutiliza tal cual; para
> `CLIENT` se añade una rama equivalente (`subjectId === session.sub`).

> **Nota scope en API existentes:** `requireStaff()` incluye `BARBER`, por lo que los mutadores
> `/api/appointments`, `/api/clients`, `/api/services` siguen siendo alcanzables por un barbero
> **sin scope**. La separación de rutas es sólo visual si no se acota también la capa de datos de
> esos endpoints. La Fase 2 añade el paso de **scopear** mutadores de `BARBER` (por `barberId`
> resuelto de `session.sub`) y los de `CLIENT` (por `email`/`clientId`), y de restringir a
> `requireRole("ADMIN","OWNER")` los que son sólo de consola (`/api/clients`, `/api/services`,
> `/api/barbers`). Las consultas de la consola admin consultan "todo"; las de los portales
> consultan "lo propio".

> **Nota semántica de `subjectId`:** el filtro del barbero en la bitácora usa `session.sub`
> (id de `User`). Confirmar que `logAuthEvent`/`logModelMutation` registran `subjectId` con el
> **id del `User`** y no con `barber.id`; si se usara `barber.id`, el portal del barbero debería
> filtrar por `barber.id` o por `barber.userId` según corresponda. Se verifica en la Fase 2 y se
> deja explícito en la tarea de binnacle.

---

## 4. Decisiones de diseño

### 4.1. Fuente de verdad central: `lib/roles.ts` (edge-safe)

Debe poder importarse desde `proxy.ts` (edge) y desde client components. Regla: **sin** Prisma,
**sin** `next/headers`, **sin** `cookies`. Solo tipos, maps y funciones puras.

```ts
// lib/roles.ts — edge-safe
import type { UserRole } from "@/app/generated/prisma/client";

export type RoleGroup = "ADMIN" | "BARBER" | "CLIENT";

export const ROLE_HOME: Record<UserRole, string> = {
  OWNER: "/dashboard",
  ADMIN: "/dashboard",
  BARBER: "/barber",
  CLIENT: "/reservations",
};

/** Rutas protegidas → roles permitidos. Solo se matchea por prefijo. */
export const ROUTE_RULES: Record<string, UserRole[]> = {
  "/dashboard": ["OWNER", "ADMIN"],
  "/appointments": ["OWNER", "ADMIN"],
  "/clients": ["OWNER", "ADMIN"],
  "/barbers": ["OWNER", "ADMIN"],
  "/services": ["OWNER", "ADMIN"],
  "/settings": ["OWNER", "ADMIN"],
  "/users": ["OWNER", "ADMIN"],
  "/visitantes": ["OWNER", "ADMIN"],
  "/manuales": ["OWNER", "ADMIN"],
  "/barber": ["BARBER"],
  "/reservations": ["CLIENT"],
};

export function homeForRole(role: UserRole | string): string {
  return ROLE_HOME[role as UserRole] ?? "/";
}

export function isRoleAllowed(pathname: string, role: UserRole | string): boolean {
  const entry = Object.entries(ROUTE_RULES).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!entry) return true; // ruta pública / no declarada
  const [, roles] = entry;
  return roles.includes(role as UserRole);
}
```

> Decisiones: el matcher es por prefijo (una regla por raíz). El fallback de `homeForRole`
> para un rol desconocido es `/`. `isRoleAllowed` devuelve `true` para rutas no declaradas
> (el landing `/`, `/terminos`, `/privacidad`, `/login` siguen públicas).

### 4.2. Redirección: rol → interfaz (una sola decisión)

El login (cliente) y `proxy.ts` (servidor) usan **exactamente** `homeForRole(role)`. Se elimina
la rama `role === "CLIENT" ? "/" : "/dashboard"` en ambos lugares.

### 4.3. Defensa en capas

1. **`proxy.ts`** (edge, primera barrera): sin token → `/login`; con token y ruta protegida no
   permitida para su rol → `homeForRole(role)`. Evita el fallo de closed-loop. **Requisito:** su
   `config.matcher` debe incluir las raíces de `/barber` y `/reservations` (además de las 7 de
   consola), porque el proxy sólo se ejecuta en las rutas listadas en el matcher.
2. **Layouts de route group** (server, segunda barrera): cada área valida su rol con
   `requireRoleOrRedirect(...)` (redirige a `homeForRole(role)`, en lugar de lanzar `DomainError`,
   porque en un layout un throw produce una página de error y no una redirección) como defensa en
   profundidad.
3. **APIs** (barrera dura): cada `POST/PATCH/DELETE` mutador ya usa `requireRole`/`requireStaff`;
   se mantiene y se revisa contra la matriz, y **se acota el scope** de datos por rol (ver nota de
   §3.4). Los endpoints sólo de consola admin quedan en `requireRole("ADMIN","OWNER")`.

### 4.4. Separación de la interfaz del barbero (decisión)

**Decidido**: la interfaz del barbero es **independiente del console admin** y está **acotada a
sus propios datos** (citas, clientes, indicadores y bitácora, según §3.4). Por tanto, `BARBER`
**no** tiene reglas en las rutas de consola admin (`/dashboard`, `/appointments`, `/clients`,
`/barbers`, `/services`, `/settings`, `/visitantes`); su home es `/barber`. Es un cambio de
comportamiento respecto a hoy (el barbero ya no entra al console admin).

> El acotado de datos (§3.4) es **independiente** de la separación de rutas: aunque en el futuro
> se quiera re-habilitar alguna vista de consola para `BARBER`, **cualquier** consulta de ese rol
> debe seguir filtrando por su `barberId`/`userId`.

### 4.5. Una sola función de acotado por rol (reutilizable)

Para no repetir `where: { barberId }` / `{ client: { email } }` en cada página y API, se propone
un helper de **scope** en `lib/scope.ts` (server-only, importa Prisma):

```ts
// lib/scope.ts — server-only (usa prisma)
export async function getCurrentBarber(sessionSub: string) {
  return prisma.barber.findUnique({ where: { userId: sessionSub } });
}
export function barberScope(barber: { id: string }): Prisma.AppointmentWhereInput {
  return { barberId: barber.id };
}
export async function getCurrentClient(email: string) {
  return prisma.client.findFirst({
    where: { email },
    orderBy: { createdAt: "asc" }, // primer Client con ese correo (email no es único)
  });
}
export function clientScope(client: { id: string }): Prisma.AppointmentWhereInput {
  return { clientId: client.id };
}
```

Estos helpers se usan en las páginas del portal y en las APIs nuevas (agenda del barbero,
reservas del cliente) para garantizar que **siempre** se consulta el subconjunto propio.

**Guard de redirección en layouts (no-lanza).** `requireRole` lanza `DomainError`, pensado para
APIs. En layouts se necesita redirigir. Se añade a `lib/permissions.ts`:

```ts
// lib/permissions.ts — guard para server layouts (redirige, no lanza)
import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/roles";

export async function requireRoleOrRedirect(...roles: UserRole[]) {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { role: true, active: true },
  });
  if (!user || !user.active || !roles.includes(user.role)) {
    redirect(homeForRole(session.role));
  }
  return { ...session, role: user.role };
}
```

Los tres layouts (`(dashboard)`, `barber`, `reservations`) usan `requireRoleOrRedirect(...)`,
cada uno con su grupo de roles, y **excluyen** la validación duplicada por `role === "CLIENT"`.

### 4.6. Staleness del rol en el JWT

El JWT guarda `role` al iniciar sesión; si un admin cambia el rol de un usuario, el token quedará
desactualizado hasta cerrar/reabrir sesión. Es el comportamiento actual de `requireRole`. La
matriz central no lo empeora. Mitigación documentada: operaciones mutadoras releen el rol desde
BD (`requireRole` ya lo hace); para la redirección del edge se depende del token, por lo que un
cambio de rol exige re-login (aceptado en esta iteración).

> **Nota JWT vs BD:** `proxy.ts` (edge) y `app/login/page.tsx` usan el `role` del **token**
> (no releen BD); `requireRole`/`requireRoleOrRedirect` **releen el rol desde BD**. Por eso los
> layouts usan rol fresco (un cambio de rol se refleja al navegar), mientras que la navegación
> edge y el login se guían por el token hasta re-login. Es la mitigación aceptada para esta
> iteración.

---

## 5. Plan de implementación

### Fase 0 — Fuente de verdad de roles

1. **`lib/roles.ts`** (nuevo): grupos, `ROLE_HOME`, `ROUTE_RULES`, `homeForRole`,
   `isRoleAllowed`. Edge-safe, sin imports pesados.
2. **`lib/roles.test.ts`** (nuevo): tests unitarios de `homeForRole`/`isRoleAllowed`,
   **incluido el test anti-loop** (el home de cada rol debe ser accesible por ese rol):

```ts
import { describe, expect, it } from "vitest";
import { ROLE_HOME, homeForRole, isRoleAllowed } from "@/lib/roles";
import type { UserRole } from "@/app/generated/prisma/client";

describe("roles", () => {
  it.each(Object.keys(ROLE_HOME) as UserRole[])("%s puede ver su home", (role) => {
    expect(isRoleAllowed(ROLE_HOME[role], role)).toBe(true); // sin loop de redirección
  });
  it("homeForRole con fallback", () => {
    expect(homeForRole("OWNER")).toBe("/dashboard");
    expect(homeForRole("CLIENT")).toBe("/reservations");
    expect(homeForRole("UNKNOWN")).toBe("/");
  });
});
```
3. **`lib/nav.ts`** (nuevo, optional) o exportar desde `lib/roles.ts`: lista de ítems de la
   consola admin como `{ href, label, icon, roles }` con `roles` derivado de `ROUTE_RULES`, para
   que el Sidebar deje de hardcodear. (Se prefiere mantener el array de íconos en el
   componente y solo sustituir `roles` por `ROUTE_RULES[href]`.)

### Fase 1 — Redirección por rol

4. **`app/login/page.tsx`**: importar `homeForRole`; sustituir
   `window.location.assign(role === "CLIENT" ? "/" : "/dashboard")` por
   `window.location.assign(homeForRole(role))`.
5. **`proxy.ts`**: generalizar la lógica. Si hay token, calcular `home = homeForRole(role)`.
   - sin token y ruta protegida → `/login`;
   - con token y `!isRoleAllowed(pathname, role)` → `home`.
   - la variable `role` (para el matcher) se deja derivada de las claves de `ROUTE_RULES`.
   - **Obligatorio:** extender `config.matcher` para que corra también en `/barber` y
     `/reservations` (además de las 7 de consola); sin esto el proxy no actúa sobre ellas.

```ts
export const config = {
  matcher: [
    "/dashboard/:path*", "/appointments/:path*", "/clients/:path*",
    "/barbers/:path*", "/services/:path*", "/settings/:path*",
    "/visitantes/:path*",
    "/barber/:path*", "/reservations/:path*", // nuevas interfaces
  ],
};
```

6. **`app/(dashboard)/layout.tsx`**: sustituir el `if (session.role === "CLIENT") redirect("/")`
   por un guard basado en `isRoleAllowed(pathname, role)`. Como el layout no recibe `pathname`,
   se valida con el grupo de la consola admin (`requireRoleOrRedirect("OWNER","ADMIN")`) y se
   redirige a `homeForRole(role)` si no pertenece (no se usa `requireRole`, que lanza error).
7. **`lib/permissions.ts`**: añadir `requireAnyRole(route)` que derive de `ROUTE_RULES` para
   reutilizar la matriz en las APIs (opcional, si se quiere una única fuente también ahí), y el
   guard `requireRoleOrRedirect(...)` del §4.5 para los layouts.

### Fase 2 — Interfaces de barbero y cliente (acotadas al usuario)

8. **`lib/scope.ts`** (nuevo, server-only): helpers del §4.5 (`getCurrentBarber`,
   `barberScope`, `getCurrentClient`, `clientScope`) para acotar consultas.
9. **`app/barber/layout.tsx`** (nuevo): server layout, `requireRoleOrRedirect("BARBER")`; resuelve
   `getCurrentBarber(session.sub)`; si no hay `Barber` vinculado → mostrar "Perfil sin vincular"
   (sin 500). Renderiza `BarberShell`. Debajo (todas con `{ barberId: barber.id }`):
   - `app/barber/page.tsx`: dashboard del barbero **con indicadores propios** (citas hoy,
     próximas, completadas, ingresos de sus citas pagadas) — consultas filtradas por
     `barberScope()`.
   - `app/barber/appointments/page.tsx` (o `agenda`): listado de **sus citas** (hoy / próximas /
     historial), con detalle, y con la base de horario del día.
   - `app/barber/clients/page.tsx`: sus **clientes** (`distinct` de `Appointment.clientId`
     donde `barberId = barber.id`), con teléfono y última cita.
   - `app/barber/binnacle/page.tsx`: **su bitácora** (entradas donde `subjectId`/`createdBy` =
     `session.sub`), reutilizando el filtro ya existente del API.
10. **`app/reservations/layout.tsx`** (nuevo): server layout,
    `requireRoleOrRedirect("CLIENT")`; resuelve
    `getCurrentClient(session.email)`. Renderiza `ClientShell`. Debajo (con `clientScope()`):
    - `app/reservations/page.tsx`: listado de **sus reservas** (próximas y pasadas, estado,
      servicio, barbero, importe) y los indicadores propios (citas completadas, gasto total).
    - `app/reservations/binnacle/page.tsx` (opcional): eventos vinculados a su cuenta
      (`subjectId === session.sub`).
    - Botón "Nueva reserva" → **página de reserva dentro del portal** (presupone sesión,
      decisión §11.4), no el modal del landing.
11. **`components/barber/`** y **`components/client/`**: componentes de shell y tarjetas
    reutilizables (reutilizar estilos de `components/sidebar.tsx`/`topbar.tsx`).
12. **Acotar APIs existentes** (prioridad alta, sin esto la separación de rutas es sólo visual):
    scopear los mutadores alcanzables por `BARBER` (`/api/appointments`, `/api/clients`,
    `/api/services`, etc.) con `barberScope()`; los de `CLIENT` con `clientScope()`; y restringir
    a `requireRole("ADMIN","OWNER")` los endpoints sólo de consola. El GET `/api/binnacle` pasa a
    permitir `CLIENT` y filtra `{ subjectId: session.sub }` para ese rol (ver §11.4).

### Fase 3 — Consolidación y pulido

13. **`components/sidebar.tsx`**: reemplazar `roles: [...]` por la lectura de `ROUTE_RULES`
    (se exporta un mapa `SIDEBAR_GROUPS` en `lib/roles.ts` o se consulta `ROUTE_RULES[href]`).
14. **`prisma/seed.ts`**: asegurar que el barbero de seed tenga `userId` (ya lo hace) e idem los
    usuarios existentes; **opcional** añadir un usuario cliente de ejemplo con `email` que tenga
    citas para poder visualizar `/reservations` en local.
15. **`app/api/auth/register/route.ts`**: sin cambios de lógica; verificar que el `role`
    devuelto coincide con `CLIENT` para que el login lo lleve a `/reservations`.
16. **`app/api/booking/route.ts`** (optional, Fase 3): si el cliente está autenticado
    (sesión CLIENT), asociar la cita al `email` de la sesión en vez de pedirlo en el body.

### Fase 4 — QA

17. Probar login con los 3 perfiles del seed (`admin`, `daniel@barberservice.local` barbero,
    un cliente registrado) y verificar la redirección.
18. Forzar acceso manual a `/dashboard` como `BARBER`/`CLIENT` → redirigido a `/barber` /
    `/reservations`.
19. Forzar acceso a `/barber` como `ADMIN` → redirigido a `/dashboard`.
20. Probar el flujo completo de registro (crea CLIENT + Client) y que cae en `/reservations`.
21. `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`.

---

## 6. Estructura de archivos nuevos y modificados

```
lib/
  roles.ts                        (nuevo: ROLE_HOME, ROUTE_RULES, homeForRole, isRoleAllowed)
  roles.test.ts                   (nuevo: pruebas unitarias + test anti-loop)
  scope.ts                        (nuevo, server-only: getCurrentBarber, barberScope, getCurrentClient, clientScope)
  permissions.ts                  (modificado: requireRoleOrRedirect para layouts, requireAnyRole para APIs)
app/
  login/page.tsx                  (modificado: homeForRole)
  (dashboard)/layout.tsx          (modificado: guard genérico + redirect a homeForRole)
  barber/
    layout.tsx                    (nuevo: requireRoleOrRedirect BARBER + BarberShell)
    page.tsx                      (nuevo: home con indicadores propios)
    appointments/page.tsx         (nuevo: listado de sus citas)
    clients/page.tsx              (nuevo: sus clientes)
    binnacle/page.tsx             (nuevo: su bitácora)
  reservations/
    layout.tsx                    (nuevo: requireRoleOrRedirect CLIENT + ClientShell)
    page.tsx                      (nuevo: listado de sus reservas + indicadores)
    binnacle/page.tsx             (nuevo, opcional: eventos de su cuenta)
app/api/
  appointments/route.ts           (modificado: scope por barberId/clientId para BARBER/CLIENT)
  clients/route.ts                (modificado: restringido a ADMIN/OWNER; scope si se mantiene BARBER)
  services/route.ts               (modificado: restringido a ADMIN/OWNER)
  barbers/route.ts                (modificado: restringido a ADMIN/OWNER)
  binnacle/route.ts               (modificado: permite CLIENT y filtra subjectId === session.sub)
proxy.ts                          (modificado: matcher expandido con /barber y /reservations + homeForRole)
components/
  sidebar.tsx                     (modificado: consumir ROUTE_RULES en lugar de arrays)
  topbar.tsx                      (verificar: mostrar rol/home del usuario, opcional)
  barber/barber-shell.tsx         (nuevo)
  client/client-shell.tsx         (nuevo)
prisma/
  seed.ts                         (modificado, opcional: cliente de ejemplo con citas)
blueprint/
  CHANGELOG.md                    (modificado: entrada Cambio correspondiente)
```

---

## 7. Convenciones de código

- `lib/roles.ts` **edge-safe**: sin `cookies`, sin `prisma`, sin `next/headers`. Solo tipos y
  funciones puras, para poder importarse desde `proxy.ts`.
- Mantener el estilo de componentes existentes (clases Tailwind con `dark:`, iconos
  `lucide-react`, ver `blueprint/spec-dark-mode.md`).
- Las rutas de consola admin (`/dashboard`, `/appointments`, …) conservan su ruta actual; no se
  renombran para no romper links ni bookmarks.
- Roles siempre como `UserRole` (enum tipado); nunca `string` suelto en las reglas.
- La **fuente de verdad** es `lib/roles.ts`; no volver a duplicar arrays de roles en otros
  archivos (Sidebar, layouts, APIs). Si una API necesita roles, importa de ahí.
- Redirecciones: usar `redirect()` de `next/navigation` en server; `window.location.assign` en
  client (por consistencia con lo actual).
- Guard de layouts: usar **`requireRoleOrRedirect(...)`** (redirige a `homeForRole`); `requireRole`
  (que lanza `DomainError`) queda reservado para APIs/handlers, no para layouts.
- `proxy.ts`: redirigir a `homeForRole(role)` con `NextResponse.redirect(new URL(home, url))`.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Loop de redirección en `proxy.ts` | El home de cada rol está dentro de su regla permitida; `isRoleAllowed(home, role) === true`. Se agrega test (`roles.test.ts`, anti-loop). |
| `proxy.ts` importa algo no edge-safe | `lib/roles.ts` es puro (sin Prisma/cookies); se garantiza con revisión y con el test de build. |
| El matcher de `proxy.ts` no cubre `/barber`/`/reservations` | Se expande `config.matcher` con las raíces de `ROUTE_RULES` (ver Fase 1, paso 5); se verifica en criterio 6. |
| Regresión: barbero pierde acceso al console admin | Decidido en §4.4; su interfaz propia en `/barber` está acotada a sus datos (§3.4). |
| **Fuga de datos**: barbero ve citas/clientes de otros | Todo query del rol `BARBER` usa `barberScope()`; ningún endpoint/página consulta sin `{ barberId }`. Se testea. |
| **Fuga de datos**: cliente ve reservas ajenas | Las consultas del rol `CLIENT` usan `clientScope()` (por `email`/`clientId` de la sesión). |
| **Fuga de datos**: APIs existentes sin scope | Los mutadores alcanzables por `BARBER`/`CLIENT` se scopen con `barberScope()`/`clientScope()` (Fase 2, paso 12); los sólo de consola pasan a `requireRole("ADMIN","OWNER")`. |
| Bitácora del barbero sin restrict | Ya existe el filtro `subjectId`/`createdBy` en `app/api/binnacle/route.ts`; se conserva y se agrega el equivalente para `CLIENT`. |
| Rol desactualizado en JWT | Operaciones mutadoras releen rol desde BD (`requireRole`). Cambios de rol exigen re-login. |
| `Client` sin FK a `User` (emparejado por email, no único) | `getCurrentClient` usa `findFirst` (email no es único); se propone `Client.userId` opcional en Fase 3. |
| Barbero sin `Barber.userId` (null) | El layout de `/barber` maneja el caso "sin vincular" con mensaje claro en lugar de 500. |
| Sidebar con roles duplicados tras el refactor | Sustituir arrays locales por `ROUTE_RULES[href]`; se elimina toda duplicación. |

---

## 9. Pruebas manuales

1. Login como `admin@barberservice.local` → `/dashboard`.
2. Login como `daniel@barberservice.local` (BARBER) → `/barber`.
3. Registrar un usuario nuevo → `/reservations`.
4. Navegar manualmente a `/dashboard` con sesión BARBER → `/barber`.
5. Navegar a `/barber` con sesión OWNER → `/dashboard`.
6. Desde el portal barbero ver **solo sus citas** del día y el detalle; confirmar que no aparecen
   citas de otros barberos.
7. Desde el portal barbero ver **solo sus clientes** (derivados de sus citas).
8. Desde el portal barbero ver **su bitácora** (solo entradas donde él es sujeto/autor).
9. Desde el portal cliente ver **solo sus reservas** (próximas y pasadas) y sus indicadores.
10. Crear/registrar dos clientes y verificar que cada uno solo ve sus propios datos.
11. Ejecutar `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`.

---

## 10. Definición de Done

- `lib/roles.ts` es la única fuente de verdad de rol→ruta y rol→home.
- `proxy.ts` + layouts redirigen por rol sin loops.
- `app/login/page.tsx` redirige con `homeForRole`.
- Existen `/barber` y `/reservations` con guard de rol y shell propio.
- **Barbero**: todos los datos (citas, clientes, indicadores, bitácora) están filtrados por su
  `barberId`/`userId`; ninguna consulta sin scope.
- **Cliente**: sus reservas e indicadores están filtrados por la sesión (`email`/`clientId`);
  ningún endpoint devuelve datos ajenos.
- **APIs**: los mutadores que `BARBER`/`CLIENT` pueden invocar están scoped (Fase 2, paso 12), y
  los sólo de consola admin exigen `ADMIN`/`OWNER`.
- `components/sidebar.tsx` no repite roles hardcodeados.
- `config.matcher` de `proxy.ts` cubre las raíces de `ROUTE_RULES`; `roles.test.ts` pasa el
  antiloop `isRoleAllowed(home, role) === true`.
- `npm run lint`, `typecheck`, `build`, `test`, `test:integration` verdes.

---

## 11. Decisiones y preguntas (resueltas)

1. **Alcance del barbero y del cliente** — **resuelto**: cada interfaz se acota a los datos
   propios del usuario (§3.4). El barbero ve citas, clientes, indicadores y bitácora asociados
   a su cuenta; el cliente ve sus reservas, sus indicadores y los registros asociados a su cuenta.
2. **¿Barbero ve la tabla de barberos/servicios (solo-lectura)?** Por defecto no; solo sus datos.
   Si se quiere una vista de agenda con el nombre de servicios, se lee `Service` como lectura
   pura (sin exponer precios globales si no se desea). **Decisión adoptada:** el portal del barbero
   no lista la tabla de barberos; para nombrar servicios en su agenda se lee `Service` en modo
   lectura (sin exponer precios globales).
3. **Nombres de rutas** — **decidido**: `/barber` (portal del barbero) y `/reservations` (portal del
   cliente). Se descartan `/agent`, `/calendario`, `/account` y `/mis-citas` para no reescribir
   todo el documento y conservar la coherencia con `ROLE_HOME`/`ROUTE_RULES`.
4. **¿Añadir `Client.userId`?** — **decidido**: en esta iteración se resuelve por `email` con
   `findFirst` (porque `Client.email` no es único); se deja documentada la migración opcional
   `Client.userId String? @unique` como refuerzo recomendado en Fase 3 (no bloqueante).
5. **¿"Nueva reserva" del cliente** al modal del landing (invitado) o a una página del portal? —
   **decidido**: página de reserva **dentro del portal** (`app/reservations/nueva/page.tsx`) que
   presupone sesión y usa `clientScope()`/`getCurrentClient`, manteniendo una única fuente de datos
   propios. El modal del landing queda para el flujo invitado (`app/api/booking`).

---

## 12. Cierre

Este cambio queda documentado en `blueprint/CHANGELOG.md` como el Cambio correspondiente,
siguiendo la plantilla (objetivo, qué se hizo, archivos, verificación, regresión). Las preguntas
abiertas de §11 quedan resueltas en el propio documento (rutas, `Client.userId`, y flujo de
"Nueva reserva"), de modo que el plan es determinista antes de pasar a la Fase 2.
