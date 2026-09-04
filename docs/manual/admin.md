# Manual de usuario — Administración (`OWNER` / `ADMIN`)

Este manual describe, paso a paso y con casos de uso, cómo operar la **consola de administración** de BarberService. La consola es la interfaz de acceso para el rol **Dueño** (`OWNER`) y **Administrador** (`ADMIN`). Ambos roles ven el mismo panel, el mismo menú lateral y las mismas herramientas; la diferencia entre ellos solo existe en la política de la base de datos (por ejemplo, solo un `ADMIN` u `OWNER` puede registrar pagos).

---

## 1. Acceso e inicio de sesión

### 1.1. Entrar al sistema

1. Abre el navegador y entra a la dirección de la plataforma.
2. Haz clic en **Iniciar sesión** o entra directamente a `/login`.
3. Escribe tu **correo electrónico** y tu **contraseña**.
4. Pulsa **Entrar**.

El sistema verifica tu usuario, tu rol y tu estado (activo). Si todo es correcto, te redirige automáticamente a tu interfaz:

- **Dueño** o **Administrador** → consola de administración (`/dashboard`).
- **Barbero** → portal del barbero (`/barber`).
- **Cliente** → portal del cliente (`/reservations`).

> **Nota de seguridad:** la sesión dura un tiempo limitado. Si llevas un rato sin actividad, el sistema puede pedirte que vuelvas a iniciar sesión. Si intentas entrar a una ruta que no corresponde a tu rol desde la URL, el sistema te reenvía a tu propia interfaz automáticamente.

### 1.2. Cerrar sesión

Haz clic en el **icono de salida** (flecha de cerrar sesión) en la esquina inferior del menú lateral. Se cerrará tu sesión y volverás a la página de acceso.

---

## 2. Estructura de la consola

La consola se divide en tres zonas:

- **Menú lateral (aside, izquierda):** navegación entre módulos. Puedes colapsarlo pulsando el botón de panel (dos flechas) para ganar espacio, o expandirlo de nuevo. En pantallas pequeñas se convierte en un menú deslizante que se abre con el botón de hamburguesa.
- **Barra superior (topbar):** muestra el título de la sección actual, un campo de **búsqueda** (⌘K), la **campana de notificaciones**, el **selector de tema** (claro/oscuro) y el botón **Nueva cita** para agendar rápidamente.
- **Contenido principal:** el área donde se muestra la página activa.

### 2.1. Módulos del menú lateral

El menú se organiza en grupos:

- **GESTIÓN:** Panel, Citas, Clientes, Barberos, Servicios.
- **NEGOCIO:** Configuración, Usuarios, Bitácora, Visitantes.
- **DOCUMENTACIÓN:** Manuales (este manual y los de barbero y cliente).

> El menú se adapta automáticamente a tu rol: solo muestra los módulos que puedes usar. Como `OWNER`/`ADMIN` puedes usar todos.

---

## 3. Panel principal (`/dashboard`)

El **Panel** es la pantalla de inicio. Resume en un solo vistazo la operación del día. Todos los números provienen de datos reales de la base de datos.

### 3.1. Indicadores (tarjetas de la parte superior)

- **Ingresos de hoy:** suma de los cobros registrados hoy.
- **Citas de hoy:** número de citas programadas para hoy, con cuántas ya están completadas.
- **Clientes activos:** clientes con perfil activo en el sistema.
- **Servicios activos:** servicios disponibles en el catálogo.

### 3.2. Citas de hoy y próxima cita

Debajo de los indicadores verás:

- **Citas de hoy:** una tabla con la hora, el cliente, el servicio, el barbero, el estado y el importe de cada cita de hoy. Cada **estado** aparece con un color distintivo (Confirmada en verde, Pendiente en ámbar, Completada en índigo, Cancelada en rojo, No asistió en gris).
- **Próxima cita:** la siguiente cita del día en formato resumen, con nombre del cliente, hora, servicio, barbero, duración y total. Tiene un botón **Ver detalles** que te lleva a la cita completa.

### 3.3. Gráficos de análisis

Al final del panel encontrarás tres análisis y dos módulos de ingresos:

- **Citas por barbero** (esta semana).
- **Estado de citas** (distribución semanal).
- **Ingresos semanales** (comparativo entre esta semana y la anterior).
- **Ingresos recientes** (últimos 7 días).
- **Servicios más vendidos** (ranking por citas completadas).

> Los gráficos son interactivos: pasa el cursor para ver el detalle de cada barra o punto.

### Caso de uso — Revisar el día de un vistazo

1. Entra a **Panel**.
2. Mira los 4 indicadores para confirmar cuánto se ha facturado y cuántas citas hay.
3. Revisa la tabla **Citas de hoy** para detectar citas pendientes de confirmar o posibles ausencias.
4. Usa **Ingresos recientes** para ver la tendencia de la semana.

---

## 4. Citas (`/appointments`)

El módulo de **Citas** gestiona toda la agenda del negocio: crear, buscar, confirmar, completar, cancelar y marcar ausencias.

### 4.1. Estados de una cita

| Estado | Significado |
| --- | --- |
| `Pendiente` | La cita fue creada pero aún no se confirma. |
| `Confirmada` | El cliente confirmó o el equipo la confirmó. |
| `Completada` | El servicio se realizó y se cobró. |
| `Cancelada` | La cita se anuló. |
| `No asistió` | El cliente no se presentó. |

### 4.2. Buscar y filtrar citas

En la parte superior de la lista puedes:

- Elegir un **rango de fechas** (desde / hasta). Por defecto se muestra la semana actual.
- Usar los **filtros** para acotar la lista (barbero, servicio, estado, cliente).

### 4.3. Crear una cita nueva

1. Pulsa **Nueva cita** (en la barra superior o en la propia página).
2. En el diálogo, elige:
   - **Cliente:** selecciona un cliente existente.
   - **Barbero:** el profesional que atenderá.
   - **Servicio:** el servicio a realizar.
   - **Fecha y hora** de inicio.
3. El sistema calcula automáticamente la **hora de fin** según la duración del servicio y el **importe** según el precio del servicio.
4. Pulsa **Guardar**.

> **Importante (regla de solapamiento):** el sistema impide que un mismo barbero tenga dos citas activas superpuestas. Si el horario que eliges choca con otra cita del barbero, la operación se rechaza con un mensaje de conflicto. Esta regla se aplica en el servidor, no solo en el navegador.

### 4.4. Cambiar el estado de una cita

Desde la lista o desde el detalle de una cita puedes:

- **Confirmar** una cita pendiente.
- **Completar** una cita (al completarla se podrá registrar el pago).
- **Cancelar** una cita.
- Marcar como **No asistió** si el cliente no se presentó.

### Caso de uso — Crear y confirmar una cita

1. Pulsa **Nueva cita**.
2. Selecciona al cliente «María Pérez», al barbero «Carlos» y el servicio «Corte de cabello» (30 min).
3. Elige hoy a las 10:00. El importe se rellena con el precio del servicio.
4. Guarda. La cita queda **Pendiente**.
5. El cliente confirma; tú la cambias a **Confirmada** desde la lista.

### Caso de uso — Resolver un conflicto de horario

1. Intentas crear una cita para «Carlos» a las 10:30, pero Carlos ya tiene una cita 10:00–10:45.
2. El sistema rechaza la operación y te avisa que el barbero ya tiene una cita en ese horario.
3. Cambia la hora a las 11:00 y vuelve a guardar.

---

## 5. Clientes (`/clients`)

El módulo de **Clientes** centraliza los perfiles de tus clientes.

- **Buscar** por nombre, correo o teléfono.
- **Crear** un cliente nuevo (nombre, datos de contacto, notas).
- **Ver** el historial: número de citas, total gastado y fecha de la última visita.
- **Editar** o **desactivar** un cliente.

### Caso de uso — Registrar un cliente nuevo

1. Entra a **Clientes**.
2. Pulsa el botón de **Nuevo cliente**.
3. Completa el nombre y, si lo tienes, correo y teléfono.
4. Guarda. A partir de ahora podrás seleccionarlo al crear citas.

---

## 6. Barberos (`/barbers`)

El módulo de **Barberos** gestiona al equipo de profesionales.

- **Crear** un barbero: nombre, especialidad, datos de contacto y foto de perfil.
- **Editar** y **desactivar** barberos. Un barbero desactivado deja de aparecer como disponible para nuevas citas.

> Cada barbero puede tener una **cuenta de usuario** vinculada para acceder al portal del barbero. El vínculo se gestiona en **Usuarios**.

---

## 7. Servicios (`/services`)

El módulo de **Servicios** define el catálogo y los precios.

- **Crear** un servicio: nombre, **duración** en minutos, **precio** y descripción.
- **Editar** precios o duración.
- **Desactivar** un servicio que ya no se ofrezca.

> La duración del servicio es la base para calcular la hora de fin de cada cita, y el precio, para calcular el importe inicial.

---

## 8. Pagos

Registrar un pago es una acción administrativa que se realiza desde el detalle de una cita (o desde la API correspondiente). Solo un `ADMIN` u `OWNER` puede registrar pagos; un barbero no está autorizado.

### 8.1. Formas de pago

| Método | Código |
| --- | --- |
| Efectivo | `CASH` |
| Tarjeta | `CARD` |
| Transferencia | `TRANSFER` |
| Otro | `OTHER` |

### 8.2. Pago completo vs. anticipo

- **Pago completo:** el importe coincide con el precio de la cita. Al registrar el pago con la opción **Completar cita** activada, la cita pasa a **Completada**.
- **Anticipo (pago parcial):** el importe es menor al precio. Representa una señal; la cita **no** se marca como completada, porque el saldo no está saldado.
- **Pago pendiente:** puedes registrar un pago con estado **Pendiente** sin cobrarlo todavía; en ese caso la cita tampoco se completa.

### 8.3. Notas del pago

Puedes añadir una **nota** al pago para registrar referencias, números de tarjeta (últimos cuatro dígitos), etc. (máximo 500 caracteres).

### Reglas que el sistema aplica

- No se admiten pagos sobre citas **Canceladas** o **No asistió**.
- Una cita solo admite **un** pago (no se puede cobrar dos veces la misma cita).
- No se puede pagar un **importe mayor** al precio de la cita.
- Si el pago es **Pendiente**, la fecha de pago queda vacía; si es **Pagado**, la fecha de pago se registra automáticamente.

### Caso de uso — Cobrar una cita completada en efectivo

1. Abre el detalle de la cita.
2. Pulsa **Registrar pago**.
3. Deja el método en **Efectivo** y el importe igual al precio.
4. Activa **Completar cita**.
5. Guarda. La cita cambia a **Completada** y el ingreso aparece en el panel.

### Caso de uso — Registrar un anticipo

1. El cliente abona parte del servicio.
2. Registra el pago por un **importe menor** al precio.
3. Deja **Completar cita** desactivado. La cita queda en su estado anterior; el anticipo queda registrado como señal.

---

## 9. Configuración (`/settings`)

El módulo de **Configuración** es el panel de administración del negocio: identidad, marca, contacto, operación, horarios y testimonios. Todo lo que configures aquí se refleja en la web pública (landing) y en la interfaz interna.

> Solo un `ADMIN` u `OWNER` puede guardar cambios aquí. Los cambios se aplican al instante y se registran en la bitácora.

### 9.1. Identidad

- **Nombre del negocio:** aparece en el menú lateral, la barra superior y la web.
- **Eslogan / subtítulo / descripción:** textos de presentación.
- **Logo y favicon:** imágenes de marca (se suben desde la configuración).

### 9.2. Imágenes

Puedes subir el **logo**, el **favicon** y la **imagen de portada** (hero) del sitio. Si no subes ninguna imagen, el sistema usa las imágenes por defecto.

### 9.3. Contacto

- **Teléfono, WhatsApp, correo, dirección** y **enlace de Google Maps**.
- **Instagram y Facebook:** enlaces a tus redes.

### 9.4. Operación

- **Moneda:** para mostrar los importes.
- **Zona horaria:** la zona horaria del negocio. Al cambiarla, todas las fechas y "hoy" se recalculan.
- **Intervalo de agenda:** el paso de tiempo entre citas (por ejemplo, 30 minutos).

### 9.5. Horarios laborables

Define para cada día de la semana si el negocio está **abierto** y a qué **horas**. Un día sin horas marcadas se considera **cerrado**. Los horarios aparecen en la web pública y en el calendario de disponibilidad.

### 9.6. Testimonios

Gestiona las reseñas que se muestran en la web: autor, rol (por ejemplo "Cliente frecuente"), puntuación (1–5 estrellas) y el texto del testimonio. Puedes añadir, editar, eliminar y reordenar.

### 9.7. Apariencia (paleta) y Telegram

- **Paleta de color:** elige el acento de la interfaz (verde, dorado, etc.).
- **Telegram:** configura el chat donde el negocio recibe notificaciones (por ejemplo, avisos de nuevas citas).

### 9.8. Copia de seguridad y bases de datos

Desde la configuración puedes gestionar la **base de datos**: copia de seguridad, restauración y reinicio. Estas acciones son sensibles y solo están disponibles para roles autorizados.

### Caso de uso — Actualizar el nombre y los horarios

1. Entra a **Configuración**.
2. En **Identidad**, cambia el nombre del negocio y guarda.
3. En **Horarios laborables**, abre el lunes y sábado y define las horas.
4. Guarda. Verifica que el menú lateral y la web muestran el nuevo nombre y horarios.

---

## 10. Usuarios (`/users`)

El módulo de **Usuarios** gestiona las cuentas de acceso al sistema y sus roles. Es donde administras quién puede entrar y a qué interfaz.

### 10.1. Roles

| Rol | Acceso | Interfaz |
| --- | --- | --- |
| `Dueño` (OWNER) | Total. Sobre el sistema y la configuración. | Consola admin |
| `Administrador` (ADMIN) | Total sobre la operación. | Consola admin |
| `Barbero` (BARBER) | Sus citas, clientes e indicadores. | Portal barbero |
| `Cliente` (CLIENT) | Sus reservas e historial. | Portal cliente |

### 10.2. Acciones disponibles

- **Crear usuario:** nombre, correo, contraseña, rol y estado.
- **Editar usuario:** cambiar nombre, correo, rol o estado.
- **Cambiar contraseña:** establecer una nueva.
- **Activar / desactivar:** un usuario desactivado no puede iniciar sesión.
- **Eliminar usuario:** borra la cuenta (operación irreversible).

> Al crear o editar un **Barbero**, puedes **vincularlo** a un perfil de barbero existente; esa vinculación es la que conecta la cuenta con el portal del barbero. Al crear un **Cliente**, la reserva se vinculará automáticamente por correo cuando haga su primera reserva.

### Caso de uso — Crear una cuenta de barbero

1. Entra a **Usuarios** y pulsa **Nuevo usuario**.
2. Escribe nombre, correo y una contraseña segura.
3. En **Rol**, elige **Barbero**.
4. En **Vinculado a barbero**, selecciona el perfil del barbero correspondiente.
5. Guarda. El barbero ya puede entrar a su portal con su correo.

### Caso de uso — Desactivar un usuario que ya no trabaja

1. Encuentra al usuario en la lista.
2. Pulsa el botón de **desactivar/activar**.
3. Confirma. El usuario ya no podrá iniciar sesión.

---

## 11. Bitácora (`/settings/binnacle`)

La **Bitácora** es el registro de auditoría del sistema: guarda quién hizo qué y cuándo. Es una fuente de trazabilidad para revisar eventos de seguridad y decisiones de negocio.

> Solo `OWNER` y `ADMIN` acceden a la bitácora completa. Un barbero solo ve los eventos vinculados a su cuenta; un cliente no tiene acceso.

### 11.1. Qué se registra

- Eventos de autenticación: inicio de sesión exitoso/fallido, cierre de sesión, acceso denegado.
- Acciones de negocio: creación, edición, cancelación y finalización de citas; creación de clientes y servicios; pagos; cambios de configuración.
- Acciones de administración: creación y edición de usuarios, cambios de rol, creación de barberos.
- Eventos de seguridad, errores de validación y errores del sistema.

### 11.2. Filtros disponibles

- **Rango de fechas.**
- **Tipo de evento.**
- **Severidad** (Debug, Info, Warning, Critical, Alert).
- **Actor** (quién hizo la acción) y **objeto** afectado.
- **Búsqueda por texto libre.**
- **IP y usuario.**

### 11.3. Columnas de la tabla

La tabla muestra fecha, evento, severidad, actor, objeto, IP y descripción. Puedes **exportar** el listado para revisarlo fuera del sistema.

### Caso de uso — Revisar un acceso fallido

1. Entra a **Bitácora**.
2. Filtra por **tipo de evento** = `login_failed`.
3. Revisa la fecha, la IP y el detalle. Esto te ayuda a detectar intentos de acceso no autorizados.

---

## 12. Visitantes (`/visitantes`)

El módulo de **Visitantes** muestra la analítica de la web pública: el tráfico, el origen (orgánico, directo, referido), la geolocalización aproximada, el tipo de dispositivo y las páginas más vistas de usuarios que navegan sin iniciar sesión.

### 12.1. Indicadores

- **Visitas totales** del periodo.
- **Usuarios orgánicos** (llegan sin referencia directa o desde un buscador).
- **Tasa de rebote** (usuarios que se fueron sin navegar).
- **Promedio de permanencia.**

### 12.2. Visualizaciones

- **Resumen de tráfico** de los últimos 30 días (total vs. orgánico).
- **Páginas más vistas.**
- **Tabla de sesiones** con ubicación, dispositivo, fuente, páginas y tiempo. Puedes **buscar** por país, ciudad o referrer y **filtrar** por dispositivo y tipo de tráfico.

### Caso de uso — Ver de dónde vienen los visitantes

1. Entra a **Visitantes**.
2. Revisa el **Resumen de tráfico** para ver la tendencia.
3. En la **tabla de sesiones**, filtra por tipo de tráfico = **REFERRAL** para ver qué sitios te recomiendan.
4. Usa la **búsqueda** para localizar visitas de un país concreto.

---

## 13. Cuestiones transversales

### 13.1. Tema claro / oscuro

En la barra superior, el **selector de tema** alterna entre claro y oscuro. El sistema recuerda tu elección y, en la primera visita, respeta la preferencia de tu dispositivo.

### 13.2. Responsive

La consola se adapta a pantallas pequeñas: el menú lateral se convierte en un menú deslizante y las tablas permiten desplazamiento horizontal para no perder columnas.

### 13.3. Seguridad de la información

- Cada operación se valida en el servidor; la interfaz nunca es la autoridad sobre las reglas de negocio.
- Los datos de la base de datos no se exponen en el código del navegador.
- Las acciones sensibles (pagos, cambios de configuración, gestión de usuarios, copias de seguridad) requieren rol de administración.

---

## 14. Resolución de problemas frecuentes

### No puedo iniciar sesión

1. Verifica el correo y la contraseña.
2. Confirma que tu cuenta está **activa** (revisa en **Usuarios**).
3. Si el problema continúa, el administrador puede revisar la **Bitácora** para ver si hubo intentos fallidos o un bloqueo.

### No encuentro una cita

Usa los **filtros de fecha** de **Citas**; por defecto se muestra solo la semana actual. Amplía el rango si la cita es anterior o posterior.

### Un cliente aparece desactivado

Un cliente desactivado deja de estar disponible para nuevas citas y no se cuenta como activo en el panel. Puedes reactivarlo desde **Clientes**.

### Se rechaza un horario

Indica que el barbero ya tiene una cita en ese rango. Elige otro horario o cambia de barbero.
