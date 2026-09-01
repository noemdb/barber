# Especificación — Mejoras en la interfaz de usuario (/users)

## 1. Resumen ejecutivo

Mejorar la experiencia del usuario en la página `/users` (dashboard del cliente) añadiendo acciones rápidas, visualizaciones de datos más atractivas, indicadores de estado claros y funcionalidades proactivas. El objetivo es reducir la fricción para operaciones comunes, aumentar el engagement y ofrecer un servicio más personalizado sin alterar la estructura de navegación existente.

## 2. Alcance del cambio

- Página `/users` (dashboard del cliente) únicamente.
- No afecta a rutas de autenticación (`/login`, `/register`) ni al landing page (`/`).
- Se reutilizan las bibliotecas ya integradas: Lucide (iconos), Tailwind CSS, ApexCharts (para gráficos).
- Se mantiene el tema claro/oscuro mediante el mecanismo de `data-theme` ya implementado.
- Los cambios son principalmente de frontend; no se requieren nuevas APIs backend salvo donde se indique explícitamente.

## 3. Mejoras propuestas

### 3.1. Acciones rápidas en tarjetas de reserva (Alto impacto / Bajo esfuerzo)
- Añadir botones "Reprogramar" y "Cancelar" directamente en cada tarjeta de reserva próxima.
- Usar iconos Lucide (`Calendar` y `Trash2`) con variantes de color según estado.
- Al hacer click, mostrar un modal de confirmación antes de ejecutar la acción.
- Las acciones llamarán a los endpoints existentes (`/api/reservations/[id]/reschedule` y `/api/reservations/[id]/cancel`) o se crearán si no existen.

### 3.2. Visualización de gasto con ApexCharts (Alto impacto / Bajo esfuerzo)
- Insertar un pequeño gráfico de líneas o barras que muestre el gasto mensual de los últimos 6 meses.
- Utilizar la librería `react-apexcharts` ya disponible en el proyecto.
- El gráfico será responsable y adaptará su tamaño al contenedor.
- Tooltip que muestre el monto exacto en formato moneda local.
- Los datos provendrán de un nuevo endpoint `/api/users/[userId]/spending-history` o se calcularán en el cliente si el historial ya viene en el payload.

### 3.3. Indicadores visuales de estado (Alto impacto / Bajo esfuerzo)
- Reemplazar los textos de estado ("Pendiente", "Completada") por badges coloreados.
- Pendiente: fondo ámbar-100, texto ámbar-800, borde ámbar-200.
- Completada: fondo verde-100, texto verde-800, borde verde-200.
- Cancelada (si aplica): fondo rojo-100, texto rojo-800, borde rojo-200.
- Usar clases Tailwind con variantes `dark:` para mantener legibilidad en modo oscuro.
- Aplicar también a la lista de reservas pasadas.

### 3.4. Tarjeta de "Servicio favorito" (Medio impacto / Bajo esfuerzo)
- Analizar el historial de reservas para determinar el servicio más frecuente.
- Mostrar una tarjeta destacada encima de "Próximas reservas" con:
  - Icono del servicio (tijeras, máquina de afeitar, etc. según tipo).
  - Nombre del servicio.
  - Botón "Reagendar igual" que lleve al flujo de reserva prellenado con ese servicio, barbero y duración.
- Si hay empate, mostrar el servicio más reciente.
- Este componente será reutilizable y podría aparecer en otras secciones (ej. perfil).

### 3.5. Calendario interactivo para nuevas reservas (Medio esfuerzo)
- Transformar el enlace "Registrar cita" en un botón que abra un modal con un mini-calendario de disponibilidad.
- El calendario mostrará los próximos 7 días con horarios disponibles marcados.
- Al seleccionar un horario, se mostrará un formulario abreviado para elegir servicio y barbero (prellenados según preferencias históricas).
- Usar una biblioteca ligera de calendario (ej. `react-date-range`) o construir un grid simple con Tailwind.
- El modal tendrá lógica de validación y enviará la petición a `/api/reservations` (endpoint existente).

### 3.6. Sección de "Próximos mantenimiento recomendado" (Medio esfuerzo)
- Basado en el historial y el tiempo transcurrido desde el último servicio, sugerir el próximo mantenimiento.
  - Ejemplo: "Hace 45 días de tu último corte, ¿agendas otro?".
  - Umbrales configurables por tipo de servicio (corte cada 30 días, barba cada 15, etc.).
- Mostrar en una tarjeta de aviso suave (fondo azul-50, texto azul-700) debajo de las estadísticas o encima del historial.
- Incluir botón "Agendar ahora" que abra el mismo flujo de reserva prellenado.

### 3.7. Modo claro/oscuro persistente (ya implementado, pero aseguramos integración)
- Verificar que el toggle de tema (si se agrega en el topbar del dashboard) funcione también en `/users`.
- Si no existe el topbar en esta página, considerar añadir un pequeño selector de tema en el header o en el menú de usuario (avatar).
- Persistir la elección en `localStorage` y respetar `prefers-color-scheme` en primera visita.

### 3.8. Descarga de historial en PDF/CSV (Bajo esfuerzo)
- Añadir un botón "Exportar historial" en la sección de historial de reservas.
- Al hacer click, generar un CSV (o PDF sencillo usando `jsPDF`) con columnas: Fecha, Servicio, Barbero, Estado, Monto.
- El archivo se descargará automáticamente con nombre `historial-barbershop-[fecha].csv`.
- Esta funcionalidad es totalmente frontend; no requiere backend.

## 4. Plan de implementación (fases)

### Fase 1 — Preparación y componentes base
1. **Crear componentes reutilizables**:
   - `components/user/ReservationActionButtons.tsx` (Reprogramar/Cancelar)
   - `components/user/StatusBadge.tsx` (badge con variantes de estado)
   - `components/user/SpendingChart.tsx` (envoltorio de ApexCharts)
   - `components/user/FavoriteServiceCard.tsx`
   - `components/user/MaintenanceSuggestion.tsx`
   - `components/user/ExportHistoryButton.tsx`
2. **Actualizar tipos y utilidades** si es necesario (ej. funciones para calcular servicio favorito, umbrales de mantenimiento).
3. **Añadir endpoints de API mock** (si se necesitan datos adicionales) en `app/api/users/[userId]/route.ts` o similares.

### Fase 2 — Integración en la página `/users`
3. **Modificar `app/users/page.tsx`** (o el archivo que corresponda a la ruta `/users`):
   - Importar los componentes creados.
   - Reestructurar el JSX para incluir:
     - Tarjeta de servicio favorito encima de "Próximas reservas".
     - Botones de acción en cada tarjeta de reserva próxima.
     - Badges de estado en todas las tarjetas.
     - Gráfico de gasto debajo de las estadísticas o en una nueva columna.
     - Sección de mantenimiento sugerido debajo del gráfico o en lateral.
     - Botón de exportar historial en la sección de historial.
   - Asegurar que la carga de datos sea eficiente (usar `useEffect` y `swr` o `react-query` si está disponible).
4. **Actualizar estilos** (Tailwind) para nuevos componentes y ajustar espaciado.

### Fase 3 — Calendario interactivo (opcional, depende de prioridad)
5. **Crear modal de calendario**:
   - `components/user/ReservationCalendarModal.tsx`.
   - Integrar con el botón "Registrar cita" (reemplazar el enlace simple).
   - Lógica de selección de horario y flujo de reserva abreviado.
6. **Conectar con la API de reservas** para crear nueva cita.

### Fase 4 — QA y ajustes
7. **Pruebas manuales** en ambas variantes de tema (claro/oscuro).
8. **Ejecutar lint, typecheck y build** para asegurar que no se introducen errores.
9. **Recoger feedback de usuarios reales** (si es posible) y ajustar según resultados.

## 5. Criterios de éxito

1. **Acciones rápidas**: El usuario puede reprogramar o cancelar una reserva próxima desde la página `/users` sin navegar a otra página, con confirmación previa.
2. **Visualización de gasto**: Se muestra un gráfico claro del gasto mensual de los últimos 6 meses, con tooltip preciso y adaptación al tema claro/oscuro.
3. **Indicadores de estado**: Los estados de reserva aparecen como badges coloreados, legibles en ambos temas.
4. **Servicio favorito**: Se muestra una tarjeta con el servicio más frecuente y un botón para reagendar igual, basado en el historial real.
5. **Mantenimiento sugerido**: Aparece una sugerencia proactiva basada en el tiempo transcurrido desde el último servicio, con umbrales razonables.
6. **Exportar historial**: El botón de descarga genera un archivo CSV (o PDF) con el historial completo de reservas.
7. **Calendario interactivo** (si se implementa): El flujo de reserva desde el calendario es intuitivo y reduce pasos respecto al flujo actual.
8. **Rendimiento**: La página sigue cargando en menos de 2 segundos (en conexión 3G simulada).
9. **Calidad de código**: `npm run lint`, `npm run typecheck` y `npm run build` finalizan sin errores ni advertencias nuevos.
10. **Accesibilidad**: Todos los botones y controles tienen `aria-label` apropiados y son navegables por teclado.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Sobrecarga de información | Introducir cambios gradualmente; usar jerarquía visual clara (tarjetas destacadas vs secundarias). |
| Inconsistencia de tema | Reutilizar el mecanismo de `data-theme` y probar en ambos temas exhaustivamente. |
| Dependencia de datos backend no disponibles | Implementar lógica de fallback en el cliente (ej. calcular gasto a partir del historial que ya se muestra). |
| Conflicto con estilos existentes | Usar clases Tailwind con scope limitado a los nuevos componentes; evitar `!important`. |
| Deterioro del rendimiento por gráfico ApexCharts | Cargar el gráfico solo cuando esté en viewport (intersection observer) o usar lazy loading simple. |

## 7. Pruebas manuales

1. Cargar `/users` como usuario autenticado (Carlos o cualquier otro).
2. Verificar que aparecen las nuevas secciones: tarjeta de servicio favorito, gráfico de gasto, botones de acción en reservas próximas, badges de estado, sugerencia de mantenimiento, botón de exportar historial.
3. Cambiar entre tema claro y oscuro (si hay toggle) y confirmar que todos los elementos adaptan sus colores correctamente.
4. Probar cada acción rápida (reprogramar, cancelar) y asegurar que se muestra confirmación y que la acción se ejecuta correctamente.
5. Hacer click en el botón de exportar historial y verificar que se descarga un CSV con los datos esperados.
6. (Si se implementa calendario) Hacer click en "Registrar cita", seleccionar un horario y completar el formulario abreviado; verificar que se crea la reserva y aparece en la lista.
7. Comprobar que los enlaces de navegación existentes siguen funcionando (Portal del cliente, Mis reservas, Bitácora, CP, Registrar cita si no se reemplazó).
8. Ejecutar el conjunto de pruebas automatizadas si existen (`npm run test`).
9. Construir la aplicación de producción (`npm run build`) y verificar que no hay errores.

## 8. Cierre

Una vez aprobado este spec, se crearán las tareas correspondientes en el sistema de gestión de tareas (o se marcarán en el TODO) siguiendo el plan de fases. Cada fase se considerará completada cuando sus criterios de éxito se cumplan y se haya verificado con lint, typecheck y build.