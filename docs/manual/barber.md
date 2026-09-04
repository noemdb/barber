# Manual de usuario — Portal del Barbero (`BARBER`)

Este manual describe cómo usar el **portal del barbero**, la interfaz que usas a diario para ver tus citas, tus clientes y tu bitácora. El portal está **acotado a tu cuenta**: solo ves la información vinculada a ti. No ves citas, clientes ni ingresos de otros barberos.

---

## 1. Acceso

### 1.1. Iniciar sesión

1. Abre la plataforma y entra a `/login`.
2. Escribe tu **correo** y tu **contraseña**.
3. Pulsa **Entrar**. El sistema te lleva automáticamente a **Portal del barbero** (`/barber`).

### 1.2. Salir

Pulsa el **icono de salida** (flecha de cerrar sesión), en la esquina superior derecha. Volverás a la pantalla de acceso.

### 1.3. ¿Qué ocurre si tu cuenta no está vinculada?

Tu cuenta de usuario debe estar **vinculada a un perfil de barbero** para que el portal funcione (el vínculo lo gestiona el administrador en **Usuarios**). Si el vínculo no existe, el portal muestra un aviso: *"Tu cuenta de usuario no está asociada a un barbero. Contacta al administrador para habilitar tu portal."* En ese caso, pide al administrador que te asocie a tu perfil.

---

## 2. Estructura del portal

El portal tiene una **barra superior** (logotipo del negocio, menú de navegación, tu avatar y el botón de cerrar sesión) y un **área de contenido** principal.

El menú superior tiene estas opciones:

- **Panel** — resumen de tu día.
- **Citas** — tu agenda.
- **Clientes** — tus clientes.
- **Bitácora** — los eventos vinculados a tu cuenta.

---

## 3. Panel (`/barber`)

El **Panel** es tu vista de resumen. Se actualiza con los datos de cada día.

### 3.1. Indicadores

- **Citas de hoy:** cuántas citas tienes programadas hoy.
- **Próximas:** cuántas citas activas (pendientes o confirmadas) vienen después.
- **Completadas:** total de citas que has completado.
- **Ingresos de hoy:** la suma de los cobros pagados por tus citas de hoy.

> **Importante:** estos números son **solo tuyos**. Reflejan las citas y pagos asociados a tu perfil, no del negocio completo.

### 3.2. Citas de hoy

La tabla **Citas de hoy** muestra, para cada cita de hoy: **hora, cliente, servicio, estado e importe**.

| Estado | Color | Significado |
| --- | --- | --- |
| Pendiente | Ámbar | Cita creada, sin confirmar. |
| Confirmada | Verde | El cliente o el equipo la confirmó. |
| Completada | Índigo | Servicio realizado. |
| Cancelada | Rojo | Cita anulada. |
| No asistió | Gris | El cliente no se presentó. |

### 3.3. Próximas citas

Debajo verás la lista de **Próximas citas**: tus próximos trabajos pendientes o confirmados, con cliente, fecha, hora y servicio.

### Caso de uso — Preparar tu jornada

1. Entra a **Panel**.
2. Mira **Citas de hoy** para saber a quién atendrás y a qué hora.
3. Revisa **Próximas citas** para anticipar lo que viene.
4. Consulta **Ingresos de hoy** para llevar la cuenta del día.

---

## 4. Mis citas (`/barber/appointments`)

La sección **Citas** concentra **tu agenda personal**. A diferencia de la consola de administración, aquí solo aparecen las citas asignadas a ti.

### 4.1. Qué puedes ver

- El **listado** de tus citas (hoy, próximas e historial), con cliente, servicio, estado e importe.
- El **detalle** de cada cita.
- El **estado** de cada una mediante colores.

### 4.2. Qué puedes hacer

El portal del barbero es de **consulta**: puedes ver tu agenda, tus clientes y tu bitácora, pero **no modificar datos**. El cambio de estado de una cita (confirmar, completar, cancelar o marcar no asistió), así como precios, descuentos y pagos, los gestiona la **administración** desde la consola.

> Si no puedes atender a un cliente, **avisa a la administración** para que actualice el estado o reprograme la cita, en lugar de dejar la cita sin atender.

### Caso de uso — Revisar el estado de una cita

1. Entra a **Citas**.
2. Localiza la cita del cliente en cuestión.
3. Revisa su **estado** y consulta a la administración si necesitas que cambie.

---

## 5. Mis clientes (`/barber/clients`)

La sección **Clientes** muestra **tus clientes**: aquellas personas que han tenido citas contigo.

- Verás el **nombre** y el **teléfono** de cada cliente.
- Podrás ver su **última cita** contigo.
- Se deriva automáticamente de tus citas: no tienes que darlos de alta; aparecen cuando reservan contigo.

> No ves la cartera completa del negocio — solo las personas que han reservado a tu nombre.

### Caso de uso — Consultar el teléfono de un cliente

1. Entra a **Clientes**.
2. Busca el nombre de la persona.
3. Copia su teléfono para confirmar la cita por WhatsApp o llamada.

---

## 6. Mi bitácora (`/barber/binnacle`)

La **Bitácora** del portal muestra **tu actividad**: los eventos de negocio y de autenticación vinculados a tu cuenta (por ejemplo, los accesos a tu perfil y las citas asociadas a tu nombre). La bitácora es de solo lectura.

- Filtra por **tipo de evento**, **severidad** y **búsqueda por texto**.
- Revisa la **fecha**, el **evento** y la **descripción**.

> La bitácora es de solo lectura. No puedes editar ni borrar entradas: es la evidencia de lo que ocurrió en el sistema.

### Caso de uso — Verificar que una cita quedó registrada

1. Entra a **Bitácora**.
2. Filtra por **tipo de evento** = citas.
3. Localiza la entrada de la cita asociada a tu perfil y revisa su detalle.

---

## 7. Consejos de uso diario

- Empieza siempre por el **Panel**: te da el contexto de tu jornada.
- Revisa el **estado** de tus citas en tu agenda; el cambio de estado lo registra la administración, así que coordina con ella para que la información se vea al día.
- Usa la **bitácora** como respaldo cuando necesites recordar qué hiciste.
- Si un horario te queda corto o largo, coméntalo con la administración: los **servicios** (duración) y la **agenda** se gestionan desde la consola admin.

---

## 8. Resolución de problemas

### Veo "Perfil sin vincular"

Tu cuenta no está asociada a un barbero. Contacta al administrador para que vincule tu cuenta (lo hace en **Usuarios**).

### No veo una cita que debería ser mía

Confirma que la cita está asignada a tu perfil. El portal solo muestra citas con tu `barberId`. Si crees que hay un error, avisa a la administración.

### No veo todos los clientes

Es normal: solo ves a quienes han reservado contigo. El listado completo del negocio está en la consola de administración.

### Los ingresos muestran 0

Los ingresos de hoy se calculan sobre los **pagos pagados** de tus citas. Si aún no se ha registrado el pago (lo hace la administración), verás 0.
