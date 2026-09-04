# Manual de usuario — Portal del Cliente (`CLIENT`)

Este manual describe cómo usar el **portal del cliente**: consultar tus reservas, ver su estado, agendar nuevas citas y revisar el historial. El portal está **acotado a tu cuenta**: solo ves tus propias reservas. No ves las citas ni los datos de otros clientes.

---

## 1. Acceso

### 1.1. Iniciar sesión

1. Abre la plataforma y entra a `/login`.
2. Escribe tu **correo** y tu **contraseña**.
3. Pulsa **Entrar**. El sistema te lleva automáticamente a **Portal del cliente** (`/reservations`).

### 1.2. Salir

Pulsa el **icono de salida** (flecha de cerrar sesión), en la esquina superior derecha. Volverás a la pantalla de acceso.

---

## 2. Estructura del portal

El portal tiene una **barra superior** (logotipo del negocio, menú de navegación, tu avatar y el botón de cerrar sesión) y un **área de contenido** principal.

El menú de navegación tiene:

- **Mis reservas** — tu lista de reservas.
- **Bitácora** — los eventos de tu cuenta.

---

## 3. Mis reservas (`/reservations`)

La pantalla **Mis reservas** es tu centro de control. Te saluda por tu nombre y muestra el estado de tus citas.

### 3.1. Indicadores

- **Reservas activas:** citas pendientes o confirmadas que vienen.
- **Historial:** número de citas ya realizadas.
- **Completadas:** citas completadas.
- **Gasto total:** lo que has pagado en total.

### 3.2. Próximas reservas

La lista **Próximas reservas** muestra tus próximas citas, con el **servicio**, la **fecha y hora**, el **barbero**, el **estado** y el **importe**.

### 3.3. Historial

La lista **Historial** contiene tus reservas pasadas, ordenadas de más reciente a más antigua.

### 3.4. Estados de una reserva

| Estado | Color | Significado |
| --- | --- | --- |
| Pendiente | Ámbar | Reserva creada, pendiente de confirmación. |
| Confirmada | Verde | Reserva confirmada. |
| Completada | Índigo | Servicio ya realizado. |
| Cancelada | Rojo | Reserva anulada. |
| No asistió | Gris | No asististe a la cita. |

---

## 4. Crear una nueva reserva

En la parte superior del portal, junto a tu saludo, hay dos botones: **Crear nueva reserva** y **Ver disponibilidad**.

### 4.1. Crear una reserva

1. Pulsa **Crear nueva reserva**.
2. Selecciona el **servicio** que quieres.
3. Elige el **barbero** y la **fecha y hora** que prefieras.
4. Revisa el **importe** y confirma. El sistema valida que el horario sea posible y que no choque con la agenda del barbero.
5. La nueva reserva aparece en **Próximas reservas** con estado **Pendiente** o **Confirmada**.

> Si no tienes aún ningún perfil de cliente, el portal te indica que aún no tienes reservas. Cuando reserves, aparecerán aquí.

### 4.2. Ver disponibilidad

El botón **Ver disponibilidad** abre un **calendario semanal** que muestra los horarios disponibles del negocio, con los servicios, barberos y citas ya ocupadas. Te ayuda a elegir un turno que te encaje antes de reservar.

### Reglas que el sistema aplica

- El **importe** se calcula según el servicio elegido.
- La **duración** y la **hora de fin** se derivan del servicio; no las cambias manualmente.
- No se puede reservar un horario que ya esté ocupado por el barbero correspondiente.

### Caso de uso — Agendar un corte de cabello

1. Entra a **Mis reservas**.
2. Pulsa **Ver disponibilidad** para ver qué turnos hay esta semana.
3. Pulsa **Crear nueva reserva**.
4. Elige «Corte de cabello», selecciona un día y una hora libres.
5. Confirma. La reserva aparece en **Próximas reservas**.

---

## 5. Mi bitácora (`/reservations/binnacle`)

La **Bitácora** del portal muestra los eventos vinculados a **tu cuenta**: por ejemplo, cuándo iniciaste sesión o cuándo creaste o cancelaste una reserva. Esto sirve como respaldo de lo que ha ocurrido en tu cuenta.

- Filtra por **tipo de evento**, **severidad** y **búsqueda por texto**.
- Revisa la **fecha**, el **evento** y la **descripción**.

> Es un registro de solo lectura: no puedes editarlo ni borrarlo.

### Caso de uso — Verificar que tu reserva quedó registrada

1. Entra a **Bitácora**.
2. Filtra por **tipo de evento** de reservas.
3. Localiza la entrada de la reserva que creaste y revisa su detalle.

---

## 6. Consejos de uso

- Revisa **Próximas reservas** con frecuencia para no perderte ninguna cita.
- Usa **Ver disponibilidad** antes de reservar para elegir el turno ideal.
- Si necesitas cambiar la hora, cancela y vuelve a reservar, o contacta al negocio.
- Revisa el **estado** (pendiente/confirmada) para saber si tu cita está confirmada.

---

## 7. Resolución de problemas

### Veo "Aún no tienes reservas"

Significa que aún no has reservado o que tu perfil aún no tiene citas asociadas. Crea tu primera reserva y aparecerá aquí.

### No encuentro un horario que me guste

Usa **Ver disponibilidad** para ver toda la semana de una vez. Los turnos ocupados no están disponibles.

### No sé si mi cita está confirmada

Revisa el **estado** en **Próximas reservas**. Si aparece **Pendiente**, aún no está confirmada por el negocio.

### No veo mis reservas antiguas

El **Historial** muestra tus reservas pasadas. Si alguna falta, contacta al negocio para revisar tu cuenta.
