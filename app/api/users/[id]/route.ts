import { prisma } from "@/lib/prisma";
import type { Prisma, UserRole } from "@/app/generated/prisma/client";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { userPatchSchema } from "@/lib/validations";
import { hash } from "@/prisma/seed-hash";
import { logModelMutation } from "@/lib/binnacle";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  barber: { select: { id: true, name: true } },
} as const;

async function assertNotLastOwner(role: string, newRole: string | undefined, deactivating: boolean) {
  if (role === "OWNER" && (newRole !== "OWNER" || deactivating)) {
    const owners = await prisma.user.count({ where: { role: "OWNER", active: true } });
    if (owners <= 1) {
      throw new DomainError(ErrorCodes.FORBIDDEN, "No puedes cambiar el rol o desactivar al último propietario", 409);
    }
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new DomainError(ErrorCodes.NOT_FOUND, "Usuario no encontrado", 404);
    return { data: user };
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const { id } = await params;
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const parse = userPatchSchema.safeParse(raw);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de usuario inválidos", 400);
    const body = parse.data;

    const existing = await prisma.user.findUnique({ where: { id }, include: { barber: true } });
    if (!existing) throw new DomainError(ErrorCodes.NOT_FOUND, "Usuario no encontrado", 404);

    if (id === actor.sub) {
      if (body.active === false) throw new DomainError(ErrorCodes.FORBIDDEN, "No puedes desactivar tu propia cuenta", 409);
      if (body.role && body.role !== existing.role) throw new DomainError(ErrorCodes.FORBIDDEN, "No puedes cambiar tu propio rol", 409);
    }

    if (body.email && body.email !== existing.email) {
      const email = body.email.toLowerCase().trim();
      const clash = await prisma.user.findUnique({ where: { email } });
      if (clash && clash.id !== id) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Ya existe un usuario con ese correo", 409);
    }

    await assertNotLastOwner(existing.role, body.role ?? existing.role, body.active === false);

    // Consistencia de rol: solo un usuario con rol BARBER puede estar vinculado a un barbero.
    const effectiveRole = body.role ?? existing.role;
    if (body.barberId && effectiveRole !== "BARBER") {
      throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Solo los usuarios con rol Barbero pueden vincularse a un barbero", 409);
    }

    const data: Prisma.UserUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email.toLowerCase().trim();
    if (body.role !== undefined) data.role = body.role as UserRole;
    if (body.active !== undefined) data.active = body.active;
    if (body.password !== undefined) data.passwordHash = await hash(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data, select: userSelect });

      // Si el rol dejó de ser BARBER se desvincula el barbero (evita vínculo colgado).
      if (body.role && body.role !== "BARBER" && existing.barber) {
        await tx.barber.update({ where: { id: existing.barber.id }, data: { userId: null } });
      } else if (body.barberId === null && existing.barber) {
        await tx.barber.update({ where: { id: existing.barber.id }, data: { userId: null } });
      } else if (typeof body.barberId === "string") {
        if (existing.barber && existing.barber.id !== body.barberId) {
          await tx.barber.update({ where: { id: existing.barber.id }, data: { userId: null } });
        }
        const barber = await tx.barber.findUnique({ where: { id: body.barberId } });
        if (!barber) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);
        if (barber.userId && barber.userId !== id) {
          throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El barbero ya está vinculado a otro usuario", 409);
        }
        await tx.barber.update({ where: { id: barber.id }, data: { userId: id } });
      }
      return updated;
    });

    await logModelMutation({
      modelName: "User",
      action: "updated",
      before: { id, name: existing.name, email: existing.email, role: existing.role, active: existing.active },
      after: { id, name: user.name, email: user.email, role: user.role, active: user.active },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request,
      title: "Usuario actualizado",
      description: `Se actualizó el usuario ${user.email}.`,
      objectId: id,
      objectType: "User",
      category: "USER_ACTION",
      severity: "INFO",
    });

    return { data: user };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const { id } = await params;

    if (id === actor.sub) throw new DomainError(ErrorCodes.FORBIDDEN, "No puedes eliminar tu propia cuenta", 409);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new DomainError(ErrorCodes.NOT_FOUND, "Usuario no encontrado", 404);

    await assertNotLastOwner(existing.role, "DELETED", true);

    await prisma.user.delete({ where: { id } });

    await logModelMutation({
      modelName: "User",
      action: "deleted",
      before: { id, name: existing.name, email: existing.email, role: existing.role, active: existing.active },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request: _request,
      title: "Usuario eliminado",
      description: `Se eliminó el usuario ${existing.email}.`,
      objectId: id,
      objectType: "User",
      category: "USER_ACTION",
      severity: "INFO",
    });

    return { data: { ok: true } };
  });
}
