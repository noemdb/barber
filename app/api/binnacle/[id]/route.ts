import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { apiError } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole("ADMIN", "OWNER", "BARBER");
    const { id } = await params;

    const entry = await prisma.binnacleEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } }, { status: 404 });
    }

    if (actor.role === "BARBER") {
      const allowed = entry.subjectId === actor.sub || entry.createdBy === actor.sub;
      if (!allowed) {
        return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "No tienes permisos para ver este evento" } }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return apiError(error);
  }
}
