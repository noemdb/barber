# BarberService

Aplicación full-stack de administración para barbería, preparada para:

- Next.js 16.2 + App Router
- React 19.2
- TypeScript
- Tailwind CSS 4
- Prisma ORM 7
- Neon PostgreSQL
- Vercel

## Funcionalidad incluida

- Login con sesión HTTP-only.
- Dashboard con métricas y agenda.
- Citas: listado por día, creación, detalle y cambio de estado.
- Validación de solapamiento de citas por barbero.
- Clientes: alta y búsqueda.
- Barberos: alta y catálogo.
- Servicios: alta, duración y precio.
- Configuración de negocio.
- Seed inicial de datos.
- API Routes protegidas con sesión.
- Prisma adapter para Neon.

## 1. Requisitos

Node.js 20.19+.

Crear una base PostgreSQL en Neon y copiar su connection string.

## 2. Variables de entorno

Copia `.env.example` a `.env.local`:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="genera-un-secreto-aleatorio-largo"
```

En producción, configura las mismas variables en Vercel.

## 3. Instalar

```bash
npm install
```

## 4. Crear esquema

Para desarrollo:

```bash
npm run db:migrate
```

Para producción / Vercel:

```bash
npm run db:deploy
```

## 5. Cargar datos demo

```bash
npm run db:seed
```

Cuentas demo:

```text
Administrador: admin@barberservice.local / Admin123!
Barbero:       daniel@barberservice.local / Barber123!
```

Cámbialas antes de producción.

Los clientes pueden crearse una cuenta desde `/login` (pestaña "Registrarse"); su rol es
`CLIENT` y no acceden al panel de administración (el booking público no requiere cuenta).

## 6. Ejecutar

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## 7. Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio desde Vercel.
3. Define `DATABASE_URL` y `AUTH_SECRET` en Project Settings → Environment Variables.
4. El build utiliza `postinstall` para generar Prisma Client.
5. Ejecuta la migración de producción antes del primer uso:

```bash
npx prisma migrate deploy
```

También se puede usar el comando de build personalizado de la plataforma/CI si quieres automatizar las migraciones, pero se recomienda controlar las migraciones de producción explícitamente.

## Arquitectura

```text
Next.js App Router
        │
        ├── Server Components
        ├── Client Components
        ├── Route Handlers
        │
        ▼
   Prisma ORM 7
        │
        ▼
  Neon PostgreSQL
        │
        ▼
      Vercel
```

## Nota de seguridad

La sesión utiliza JWT en cookie `httpOnly`. `AUTH_SECRET` debe ser un valor aleatorio, largo y exclusivo de producción. La contraseña demo debe cambiarse antes de exponer la aplicación públicamente.
