# Especificación — Mejoras en el portal del cliente (`/reservations`)

> **Reescribe a:** `archive/spec-user-dashboard-improvements-legacy.md` (spec anterior que apuntaba
> a `/users`, que en BarberService es la **gestión de usuarios admin** y no un dashboard de
> cliente). Este spec corrige el destino al **portal real del cliente**.
> **Feature:** Portal del cliente · **Ruta:** `app/reservations` · **Acceso:** `CLIENT`.

---

## 1. Resumen ejecutivo

Mejorar la experiencia del **portal del cliente** (ruta `/reservations`, hoy `app/reservations/page.tsx`)
añadiendo acciones rápidas, un gráfico de gasto, la tarjeta de "servicio favorito" y una sugerencia
proactiva de mantenimiento. El objetivo es reducir fricción y personalizar el servicio **sin alterar
la estructura de navegación ni el sistema de roles existente**.

**Estado actual del portal (verificado en el código):** el portal **ya implementa** parte de lo que
el spec anterior pedía para `/users`. Por tanto, este documento separa **lo ya hecho** (no re-trabajar)
de **las mejoras nuevas** que sí aportan valor.

---

## 2. Alcance del cambio

- Únicamente el portal del cliente: `app/reservations/page.tsx` (+ componentes client nuevos en
  `components/client/`).
- No afecta a `/login`, `/`, ni al console admin (`(dashboard)`).
- Se reutilizan librerías ya integradas: `lucide-react`, Tailwind, `react-apexcharts` (para el
  gráfico de gasto), `money()` de `@/lib/format`.
- Tema claro/oscuro: ya resuelto por `ThemeProvider`/`data-theme` (ver `spec-dark-mode.md`).
- No se toca el RBAC: el portal ya valida `requireRoleOrRedirect("CLIENT")` y scopea por
  `clientScope(client)`.

### Qué NO se va a implementar (ya existe)

| Cosa | Dónde está hoy |
| --- | --- |
| Badges de estado de reserva (Confirmada/Pendiente/Completada/Cancelada/No asistió) | `statusClass`/`statusLabel` en `app/reservations/page.tsx` |
| Calendario interactivo para nueva reserva | `components/client/weekly-availability-calendar.tsx` + `CreateAppointmentDialog` |
| Modal de nueva reserva | `components/client/create-appointment-dialog.tsx` (se abre con el evento `barber:open-booking` → `app/api/booking`) |
| Modo claro/oscuro persistente | `ThemeProvider` en `app/reservations/layout.tsx` |
| KPIs (reservas activas, historial, completadas, gasto total) | Cards `Stat` en `app/reservations/page.tsx` |

---

## 3. Mejoras propuestas

### 3.1. Acciones rápidas en reservas próximas (Alto impacto / Bajo esfuerzo)

- Añadir botones **"Reprogramar"** y **"Cancelar"** en cada tarjeta de reserva próxima.
- Iconos Lucide `Calendar` y `Trash2`, con color según estado; modal de confirmación antes de
  ejecutar.
- **Dependencia de backend:** NO existe `/api/reservations` hoy. Se requiere crear un endpoint
  **client-scoped** para cancelar/reprogramar la cita propia: `PATCH /api/reservations/[id]` que
  valida `requireRoleOrRedirect("CLIENT")` + `clientScope(client)` (patrón `lib/scope.ts`) y cambia
  el `status` (p.ej. a `CANCELLED`) o `startsAt` (al reprogramar). Alternativa mínima: exponer solo
  **cancelar** en esta iteración (`PATCH` a `CANCELLED`) y dejar "reprogramar" como flujo de crear
  nueva + cancelar la anterior.

### 3.2. Visualización de gasto con ApexCharts (Alto impacto / Bajo esfuerzo)

- Área/linea con el **gasto por mes de los últimos 6 meses**, calculado **en el servidor**
  (`app/reservations/page.tsx`) con `prisma.payment.groupBy` (filtrado por `status: "PAID"` +
  `clientScope`) y formateado con `money(…, currency)`.
- Componente cliente `components/client/spending-chart.tsx`, cargado con
  `dynamic(() => import("react-apexcharts"), { ssr: false })` y theme-aware vía `useTheme()`.
- Los datos viajan ya tipados desde el server component (no se hacen fetch en cliente).

### 3.3. Tarjeta de "Servicio favorito" (Medio impacto / Bajo esfuerzo)

- Computar en el servidor el servicio más frecuente del historial del cliente
  (`groupBy serviceId` sobre sus citas) y mostrar una tarjeta destacada:
  nombre, icono y botón **"Agendar igual"** que abre `CreateAppointmentDialog` prefillado con ese
  servicio y barbero. En empate, el más reciente.
- Componente `components/client/favorite-service-card.tsx`.

### 3.4. Sugerencia de "próximo mantenimiento" (Medio esfuerzo)

- Basado en la última cita y umbrales por tipo de servicio (p.ej. corte cada 30 días, barba cada 15),
  mostrar un aviso suave: "Hace X días de tu último corte, ¿agendas otro?" con botón "Agendar ahora".
- Umbrales configurables por servicio (campo nuevo `Service.recEveryDays Int?` — **requiere
  migración Prisma**; opcional en esta iteración, se puede hardcodear un mapa de umbrales por
  `service.name` si no se quiere tocar esquema).
- Componente `components/client/maintenance-suggestion.tsx`.

### 3.5. Exportar historial en CSV (Bajo esfuerzo)

- Botón "Exportar historial" junto a la lista "Historial" que genere un CSV cliente con columnas:
  Fecha, Servicio, Barbero, Estado, Monto (los datos ya están en el server component). 100% frontend.

---

## 4. Plan de implementación (fases)

### Fase 1 — Preparación (componentes base)
1. Crear `components/client/spending-chart.tsx`, `favorite-service-card.tsx`,
   `maintenance-suggestion.tsx`, `reservation-action-buttons.tsx`, `export-history-button.tsx`.
2. (Opcional, si se requiere) migración Prisma `Service.recEveryDays Int?` para umbrales de
   mantenimiento.
3. (Si se incluye 3.1) crear `app/api/reservations/[id]/route.ts` client-scoped.

### Fase 2 — Integración en `app/reservations/page.tsx`
4. Calcular en el `Promise.all` existente: `spendingByMonth`, `favoriteService`, `lastAppointment`,
   sugerencia de mantenimiento; pasarlos a los nuevos componentes.
5. Insertar los componentes: favorito encima de "Próximas reservas", sugerencia bajo las stats o
   encima del historial, gráfico bajo las stats, botón exportar en "Historial", acciones en cada
   tarjeta próxima.
6. Ajustar estilos Tailwind con variantes `dark:` (coherencia con `spec-dark-mode.md`).

### Fase 3 — QA
7. Probar en ambos temas (claro/oscuro) y como cliente con reservas y sin reservas (empty state).
8. Verificar que los flags/acciones no rompen el open del `CreateAppointmentDialog`.
9. `npm run test`, `npm run typecheck`, `npm run build` verdes.

---

## 5. Criterios de éxito

1. El portal muestra el gráfico de gasto de 6 meses con tooltip en moneda local y adaptado a tema.
2. La tarjeta de servicio favorito aparece solo cuando hay historial; "Agendar igual" prellena el
   dialog con servicio (+barbero) sin pasos extra.
3. La sugerencia de mantenimiento usa la última cita y umbrales razonables; enlaza a reserva.
4. Las acciones de cancelar/reprogramar (si se implementan) solo afectan a la cita propia y piden
   confirmación.
5. El botón "Exportar historial" genera y descarga `historial-barbershop-<fecha>.csv`.
6. Los badges de estado y el calendario existentes se mantienen sin regresiones.
7. `npm run test`, `npm run typecheck`, `npm run build` finalizan sin errores.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Sobrecarga de información | Jerarquía visual clara; introducir de forma gradual. |
| Inconsistencia de tema | Reusar `data-theme` y `dark:`; probar ambos temas. |
| Endpoints client-scoped incorrectos | Validar con `requireRoleOrRedirect("CLIENT")` + `clientScope(client)` (patrón `lib/scope.ts`), nunca confiar en el fetch del cliente. |
| Servicio favorito sin datos | Mostrar la tarjeta solo si hay historial; si no, ocultarla. |
| Umbrales de mantenimiento dependen de esquema | Hardcodear un mapa por `service.name` si se evita migración; documentar la alternativa. |
| Degradación por ApexCharts | Cargar el gráfico con `dynamic(..., { ssr: false })` y solo al estar en viewport. |

---

## 7. Pruebas manuales

1. Login como cliente de prueba (con reservas) → `/reservations`.
2. Verificar gráfico de gasto, tarjeta de favorito, sugerencia de mantenimiento, badges y botón de
   exportar.
3. Cambiar a tema oscuro y confirmar que todo adapta colores.
4. (Si se implementa) cancelar una reserva próxima → confirmación → estado `Cancelada`; confirmar que
   la cita de otro cliente no se ve afectada.
5. Exportar historial → descarga el CSV con las columnas esperadas.
6. Login como cliente **sin** reservas → empty state sin romper los componentes.
7. Ejecutar `npm run test`, `npm run typecheck`, `npm run build`.

---

## 8. Cierre

El plan se ejecuta por fases (Fase 1 es base; Fases 3.1–3.5 son relativamente independientes entre
sí). Este spec reemplaza al legado `archive/spec-user-dashboard-improvements-legacy.md` que apuntaba
a la ruta equivocada. Cada fase se considera completa cuando sus criterios (sección 5) se cumplen con
`test + typecheck + build` verdes, y se registra la entrada correspondiente en `blueprint/CHANGELOG.md`.
