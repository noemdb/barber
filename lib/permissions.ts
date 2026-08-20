import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { DomainError, ErrorCodes } from "@/lib/errors";
import type { UserRole } from "@/app/generated/prisma/client";

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

export async function requireStaff() {
  return requireRole("ADMIN", "OWNER", "BARBER");
}