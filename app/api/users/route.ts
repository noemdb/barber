import { prisma } from "@/lib/prisma";
import type { Prisma, UserRole } from "@/app/generated/prisma/client";
import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { userCreateSchema } from "@/lib/validations";
import { hash } from "@/prisma/seed-hash";
import { logModelMutation } from "@/lib/binnacle";

const ROLES = new Set(["OWNER", "ADMIN", "BARBER", "CLIENT"]);
const LIMIT = 20;

export async function GET(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const role = url.searchParams.get("role")?.trim() ?? "";
    const active = url.searchParams.get("active")?.trim() ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? String(LIMIT)) || LIMIT));

    // Ordenamiento de columna (server-side, sobre todo el set paginado)
    const sortRaw = url.searchParams.get("sort") ?? "createdAt";
    const sortKey: "name" | "role" | "createdAt" =
      sortRaw === "name" || sortRaw === "role" ? sortRaw : "createdAt";
    const dir: "asc" | "desc" = url.searchParams.get("dir") === "desc" ? "desc" : "asc";
    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortKey]: dir };

    const where: Prisma.UserWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (ROLES.has(role)) where.role = role as UserRole;
    if (active === "true") where.active = true;
    else if (active === "false") where.active = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          barber: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data: { users, total, page, limit } };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const actor = await requireRole("ADMIN", "OWNER");
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object") throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Cuerpo inválido", 400);

    const parse = userCreateSchema.safeParse(raw);
    if (!parse.success) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Datos de usuario inválidos", 400);

    const body = parse.data;
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new DomainError(ErrorCodes.VALIDATION_ERROR, "Ya existe un usuario con ese correo", 409);

    const passwordHash = await hash(body.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email, passwordHash, role: body.role, active: body.active },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      });

      if (body.barberId) {
        const barber = await tx.barber.findUnique({ where: { id: body.barberId } });
        if (!barber) throw new DomainError(ErrorCodes.NOT_FOUND, "Barbero no encontrado", 404);
        if (barber.userId && barber.userId !== created.id) {
          throw new DomainError(ErrorCodes.VALIDATION_ERROR, "El barbero ya está vinculado a otro usuario", 409);
        }
        await tx.barber.update({ where: { id: barber.id }, data: { userId: created.id } });
      }
      return created;
    });

    await logModelMutation({
      modelName: "User",
      action: "created",
      after: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active },
      actor: { id: actor.sub, email: actor.email, role: actor.role, name: actor.name },
      request,
      title: "Usuario creado",
      description: `Se creó el usuario ${user.email} con rol ${user.role}.`,
      objectId: user.id,
      objectType: "User",
      category: "USER_ACTION",
      severity: "INFO",
    });

    return { data: user, status: 201 };
  });
}
