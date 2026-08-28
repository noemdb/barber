# Plan Integral — Modo Dark / Light en Dashboard

## 1. Resumen ejecutivo

Implementar un toggle persistente para alternar entre tema claro y oscuro en la
aplicación del dashboard (`/dashboard/*`). El objetivo es cubrir la necesidad de
operar la administración con un look premium oscuro sin sacrificar la legibilidad
del modo claro actual.

**Alcance del cambio**

- Activación manual desde el `Topbar` mediante un botón.
- Persistencia en `localStorage` y respeto a `prefers-color-scheme` en la primera
  carga.
- Sin parpadeo (FOUC) en el render inicial.
- Cobertura completa de los componentes actualmente solo `light`:
  - `app/(dashboard)/layout.tsx`
  - `components/topbar.tsx`
  - `components/sidebar.tsx`
  - `components/dashboard/revenue-chart.tsx`
  - `app/(dashboard)/dashboard/page.tsx`
  - `app/(dashboard)/appointments/page.tsx`
  - `app/(dashboard)/appointments/[id]/page.tsx`
  - `app/(dashboard)/clients/page.tsx`
  - `app/(dashboard)/barbers/page.tsx`
  - `app/(dashboard)/services/page.tsx`
  - `app/(dashboard)/settings/page.tsx`
  - `components/upcoming-appointments-dialog.tsx`
- El landing page (`/`) y el login (`/login`) **no** se ven afectados por este
  cambio (siguen con su propio esquema).
- El toggle se aplica solo dentro del grupo de rutas `(dashboard)`.

**Criterios de éxito**

1. El botón en el `Topbar` alterna tema y persiste entre recargas.
2. No hay parpadeo al cargar la página.
3. Todos los textos, superficies y bordes del dashboard son legibles en ambos
   temas.
4. `npm run lint`, `npm run typecheck` y `npm run build` finalizan sin errores.
5. La elección del usuario se respeta al cambiar de ruta dentro del dashboard.

---

## 2. Decisiones de diseño

### 2.1. Mecanismo de tema

Se adopta **`data-theme="dark"` en `<html>`** (selector `[data-theme="dark"]`)
controlado por CSS, complementado con la clase `dark` cuando Tailwind la
necesite.

- `data-theme` es la fuente de verdad: el `<html>` siempre lleva `data-theme="light"`
  o `data-theme="dark"`. Esto evita depender solo de la clase `dark` y permite
  reglas CSS que comparen atributos (`html[data-theme="dark"]`).
- Tailwind v4 soporta `darkMode: ["selector", '[data-theme="dark"]']` mediante
  `@custom-variant` en CSS. Esta variante reemplaza el esquema basado en
  `prefers-color-scheme` para evitar oscurecer el landing.
- Se añade `color-scheme: light dark` en `<html>` para que los controles nativos
  (date pickers, scrollbars) se adapten.

### 2.2. Persistencia y FOUC

- Script inline en `app/(dashboard)/layout.tsx` ejecutado antes del primer paint
  (al ser Server Component, se inyecta en el `<head>` de la página).
- El script:
  1. Lee `localStorage.getItem("theme")`.
  2. Si no existe, lee `prefers-color-scheme` del navegador.
  3. Escribe `data-theme` en `document.documentElement`.
- El cliente se hidrata con un `useEffect` que valida el valor del DOM y lo
  expone vía un Context (`ThemeProvider`) para que `Topbar` y `Sidebar`
  lean/escriban el estado.

### 2.3. Provider

Crear `components/theme/theme-provider.tsx`:

- Contexto con `theme: "light" | "dark"` y `setTheme(theme)`.
- Al montar, sincroniza con `document.documentElement.dataset.theme`.
- `setTheme` actualiza el `data-theme`, persiste en `localStorage` y dispara
  un `storage` event listener para mantener sincronía entre pestañas.

### 2.4. Toggle UI

- Nuevo componente `components/theme/theme-toggle.tsx` con icono
  `Sun`/`Moon` de `lucide-react`.
- Animación cross-fade entre iconos (200 ms).
- Botón con `aria-label` dinámico ("Cambiar a tema oscuro" / "Cambiar a tema
  claro") y `aria-pressed`.
- Se inserta en el `Topbar` entre la campana de notificaciones y el botón
  "Nueva cita".

### 2.5. Paleta

Reutilizar los tokens de color ya definidos (`gold`, `gold-light`, `gold-dark`)
para el acento. El resto del esquema se construye con variables CSS para poder
reutilizarlas en componentes que no son clases Tailwind.

| Token | Light | Dark |
| --- | --- | --- |
| `--surface-base` | `zinc-50` (`#fafafa`) | `zinc-950` (`#09090b`) |
| `--surface-raised` | `white` | `zinc-900` (`#18181b`) |
| `--surface-muted` | `zinc-100` | `zinc-800` |
| `--border-subtle` | `zinc-200` | `zinc-800` |
| `--border-strong` | `zinc-300` | `zinc-700` |
| `--text-primary` | `zinc-900` | `zinc-100` |
| `--text-secondary` | `zinc-500` | `zinc-400` |
| `--text-muted` | `zinc-400` | `zinc-500` |
| `--accent` | `gold` | `gold-light` |

Las clases Tailwind se ajustan en cada componente usando el patrón
`bg-white dark:bg-zinc-900` (Tailwind v4) — los componentes deben poder
compilar con `darkMode: ['selector', '[data-theme="dark"]']`.

### 2.6. Componentes con estilo manual (no Tailwind)

- `components/dashboard/revenue-chart.tsx` — usar `currentColor` y clases
  `dark:` para el color de barras y ejes.
- `components/upcoming-appointments-dialog.tsx` — verificar que el fondo
  (`bg-white`) tenga un equivalente `dark:bg-zinc-900`.

---

## 3. Plan de implementación

### Fase 1 — Cimientos

1. **`app/globals.css`**
   - Añadir `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`.
   - Definir variables CSS para superficies, bordes, texto y acento dentro de
     `[data-theme="light"]` y `[data-theme="dark"]`.
   - Mantener `@import "tailwindcss"` al inicio.
2. **`app/layout.tsx`**
   - Añadir `color-scheme` en `<html>` con un `suppressHydrationWarning` (para
     que React no se queje cuando el script inline cambia `data-theme`).
3. **`components/theme/theme-provider.tsx`** (nuevo)
   - Context + `useTheme` hook.
   - Sincronización con `localStorage` y `prefers-color-scheme` en mount.
4. **`components/theme/theme-toggle.tsx`** (nuevo)
   - Botón con icono y accesibilidad.
5. **Script anti-FOUC en `app/(dashboard)/layout.tsx`**
   - Server Component que renderiza un `<Script>` con la lógica de detección
     de tema (vía `<script dangerouslySetInnerHTML>` en `<head>`).

### Fase 2 — Integración en el shell

6. **Envolver el dashboard en `ThemeProvider`**: editar
   `app/(dashboard)/layout.tsx` para que la salida de `Sidebar + Topbar + main`
   viva dentro del provider.
7. **Insertar `ThemeToggle` en `Topbar`** entre la campana y "Nueva cita".
8. **Adaptar `Sidebar`**:
   - Cambiar `bg-white border-zinc-200` por `bg-white dark:bg-zinc-950` y
     equivalentes.
   - Ajustar `bg-zinc-50`, `text-zinc-500`, `text-zinc-600`, `border-zinc-200`
     en cada caso.
   - Botón de cerrar sesión y badge de citas de hoy.

### Fase 3 — Adaptar páginas internas

9. **`app/(dashboard)/dashboard/page.tsx`**: revisar `bg-zinc-50`, tarjetas,
   KPIs y CTA.
10. **`app/(dashboard)/appointments/page.tsx`**: filtros, lista, badges.
11. **`app/(dashboard)/appointments/[id]/page.tsx`**: detalle, estados.
12. **`app/(dashboard)/clients/page.tsx`**: tabla, dialog de creación.
13. **`app/(dashboard)/barbers/page.tsx`**: tabla, dialog, tarjetas.
14. **`app/(dashboard)/services/page.tsx`**: tabla, dialog, precios.
15. **`app/(dashboard)/settings/page.tsx`**: tabs y formularios.
16. **`components/dashboard/revenue-chart.tsx`**: colores de barras, ejes,
    tooltip.
17. **`components/upcoming-appointments-dialog.tsx`**: fondo, textos, botones.

### Fase 4 — QA

18. Verificar manualmente cada ruta en ambos temas (dev server).
19. Capturar regresiones en Chrome DevTools con `prefers-color-scheme` forzado
    a `light` y `dark`.
20. Ejecutar `npm run lint`, `npm run typecheck`, `npm run build`.
21. Medir contraste con las herramientas de DevTools.

---

## 4. Convenciones de código

- Añadir `dark:` solo en clases que no dependan de tokens personalizados.
- Cuando un color ya esté disponible como variable CSS (`--text-secondary`),
  usar `text-[var(--text-secondary)]` para componentes que no son Tailwind.
- Evitar `style={{ color: 'white' }}` en línea: mover a clases para que el
  `dark:` se aplique.
- Para badges con colores semánticos (verde, rojo, ámbar), mantener el color
  de acento pero ajustar el fondo y borde con `dark:` (p. ej.
  `bg-emerald-50 dark:bg-emerald-950/30`).

---

## 5. Estructura de archivos nuevos y modificados

```
app/
  globals.css                       (modificado: custom-variant + variables)
  layout.tsx                        (modificado: color-scheme + suppressHydrationWarning)
  (dashboard)/
    layout.tsx                      (modificado: ThemeProvider + anti-FOUC script)
    dashboard/page.tsx              (modificado: clases dark:)
    appointments/page.tsx           (modificado)
    appointments/[id]/page.tsx      (modificado)
    clients/page.tsx                (modificado)
    barbers/page.tsx                (modificado)
    services/page.tsx               (modificado)
    settings/page.tsx               (modificado)
components/
  theme/
    theme-provider.tsx              (nuevo)
    theme-toggle.tsx                (nuevo)
  topbar.tsx                        (modificado: inserta ThemeToggle)
  sidebar.tsx                       (modificado: clases dark:)
  upcoming-appointments-dialog.tsx  (modificado)
  dashboard/revenue-chart.tsx       (modificado)
```

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Parpadeo al cargar | Script inline en `<head>` antes de cualquier render. |
| Clase `dark` colisiona con el landing | Usar selector `[data-theme="dark"]` con ámbito al subárbol `(dashboard)` o a `<html>`. Si afecta al landing, envolver solo el dashboard con un atributo `data-theme` propio. |
| Componentes con `style={{ color }}` rompen el tema | Auditar y refactorizar a clases Tailwind con `dark:`. |
| Scrollbars claras en dark | `color-scheme: light dark` en `<html>`. |
| Persistencia no funciona con `prefers-color-scheme` del SO | `setTheme` se llama explícitamente desde el botón; el `prefers-color-scheme` solo es el valor por defecto. |
| Cambios de tema durante Server Components no aplican | El cambio se aplica desde el cliente; el servidor siempre renderiza con el tema por defecto (light). La transición es inmediata después de hidratar. |

---

## 7. Pruebas manuales

1. Recargar `/dashboard` en una pestaña nueva y verificar que el tema
   coincide con la preferencia del SO la primera vez.
2. Pulsar el toggle y recargar la página: el tema elegido debe persistir.
3. Cambiar el tema en una pestaña y ver que la otra se sincroniza vía el
   evento `storage`.
4. Probar las rutas: `/dashboard`, `/appointments`, `/appointments/[id]`,
   `/clients`, `/barbers`, `/services`, `/settings`.
5. Abrir el modal de "Próximas citas" en ambos temas.
6. Visitar `/` y `/login` y confirmar que **no** cambiaron con el toggle del
   dashboard.

---

## 8. Tareas de seguimiento

Cada paso enumerado en la sección 3 (Fase 1 → 4) debe registrarse como
`TaskCreate` antes de empezar a trabajar. Marcar `in_progress` al iniciar y
`completed` al validar con lint + typecheck + build.

---

## 9. Cierre

Una vez aprobado el plan, ejecutar las fases en orden sin saltarse pasos. La
Fase 1 es bloqueante para las demás; las Fases 2 y 3 se pueden paralelizar
entre sí (Topbar/Sidebar vs páginas internas). La Fase 4 cierra con QA y
verificación.
