import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/permissions";
import { requireRole } from "@/lib/permissions";
import { withApi } from "@/lib/api";
import { clientCreateSchema } from "@/lib/validations";

export async function GET() {
  return withApi(async () => {
    await requireStaff();
    return { data: await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } }) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireRole("ADMIN", "OWNER");
    const body = clientCreateSchema.parse(await request.json().catch(() => null));
    return { data: await prisma.client.create({ data: body }), status: 201 };
  });
}