import { prisma } from "@/lib/prisma";
import { getSession, requireSession } from "@/lib/auth";
import { DomainError, ErrorCodes } from "@/lib/errors";
import type { UserRole } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/roles";

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { id: true, role: true, active: true },
  });
  if (!user || !user.active) {
    throw new DomainError(ErrorCodes.UNAUTHORIZED, "Sesión no válida", 401);
  }
  if (!roles.includes(user.role)) {
    throw new DomainError(ErrorCodes.FORBIDDEN, "No tienes permisos para realizar esta operación", 403);
  }
  return { ...session, role: user.role };
}

/**
 * Guard para server layouts: si no hay sesión redirige a `/login`; si el rol del usuario
 * (releído desde BD) no está en `roles`, redirige al home de su rol. A diferencia de
 * `requireRole` (que lanza `DomainError` y se usa en APIs), este guard redirige para que
 * un layout nunca renderice una página de error.
 */
export async function requireRoleOrRedirect(...roles: UserRole[]) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { role: true, active: true },
  });
  if (!user || !user.active || !roles.includes(user.role)) {
    redirect(homeForRole(session.role));
  }
  return { ...session, role: user.role };
}
