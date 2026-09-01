import type { UserRole } from "@/app/generated/prisma/client";

export type RoleGroup = "ADMIN" | "BARBER" | "CLIENT";

/** Mapa rol → interfaz de inicio después del login. */
export const ROLE_HOME: Record<UserRole, string> = {
  OWNER: "/dashboard",
  ADMIN: "/dashboard",
  BARBER: "/barber",
  CLIENT: "/reservations",
};

/** Rutas protegidas → roles permitidos. Solo se matchea por prefijo (una regla por raíz). */
export const ROUTE_RULES: Record<string, UserRole[]> = {
  "/dashboard": ["OWNER", "ADMIN"],
  "/appointments": ["OWNER", "ADMIN"],
  "/clients": ["OWNER", "ADMIN"],
  "/barbers": ["OWNER", "ADMIN"],
  "/services": ["OWNER", "ADMIN"],
  "/settings": ["OWNER", "ADMIN"],
  "/users": ["OWNER", "ADMIN"],
  "/visitantes": ["OWNER", "ADMIN"],
  "/barber": ["BARBER"],
  "/reservations": ["CLIENT"],
};

/** Home del rol. Un rol desconocido cae en `/` (landing público). */
export function homeForRole(role: UserRole | string): string {
  return ROLE_HOME[role as UserRole] ?? "/";
}

/**
 * Roles permitidos para una ruta, resuelto por prefijo (una regla por raíz).
 * Devuelve `[]` para rutas no declaradas (landing `/`, `/terminos`, `/privacidad`,
 * `/login` → públicas). Soporta rutas anidadas: `/settings/binnacle` cae en `/settings`.
 */
export function rolesForPath(pathname: string): UserRole[] {
  const entry = Object.entries(ROUTE_RULES).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return entry ? entry[1] : [];
}

/**
 * Indica si un rol puede acceder a una ruta. Las rutas no declaradas
 * (landing `/`, `/terminos`, `/privacidad`, `/login`) son públicas → true.
 */
export function isRoleAllowed(pathname: string, role: UserRole | string): boolean {
  const roles = rolesForPath(pathname);
  // Rutas no declaradas (landing `/`, `/terminos`, `/privacidad`, `/login`) son públicas.
  return roles.length === 0 || roles.includes(role as UserRole);
}
