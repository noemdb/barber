import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

export default async function BinnacleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("ADMIN", "OWNER");

  const entry = await prisma.binnacleEntry.findUnique({
    where: { id },
  });

  if (!entry) notFound();

  const prettyJSON = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    return JSON.stringify(value, null, 2);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">Bitácora</p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</h1>
        </div>
        <a
          href="/settings/binnacle"
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Volver
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-zinc-500">Evento</dt><dd className="font-medium text-zinc-900 dark:text-zinc-100">{entry.eventType}</dd></div>
            <div><dt className="text-zinc-500">Categoría</dt><dd>{entry.category}</dd></div>
            <div><dt className="text-zinc-500">Severidad</dt><dd>{entry.severity}</dd></div>
            <div><dt className="text-zinc-500">Fecha</dt><dd>{new Date(entry.createdAt).toLocaleString("es-ES")}</dd></div>
            <div><dt className="text-zinc-500">Creado por</dt><dd>{entry.createdBy ?? "Sistema"}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-zinc-500">Actor</dt><dd>{entry.subjectIdentifier ?? entry.subjectType ?? "Sistema"}</dd></div>
            <div><dt className="text-zinc-500">Tipo de sujeto</dt><dd>{entry.subjectType ?? "—"}</dd></div>
            <div><dt className="text-zinc-500">ID de sujeto</dt><dd>{entry.subjectId ?? "—"}</dd></div>
            <div><dt className="text-zinc-500">IP</dt><dd>{entry.ipAddress ?? "—"}</dd></div>
            <div><dt className="text-zinc-500">Session</dt><dd className="break-all">{entry.sessionId ?? "—"}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Descripción</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{entry.description ?? "Sin descripción adicional."}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Antes</h2>
          <pre className="overflow-x-auto rounded-xl bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{prettyJSON(entry.oldValues)}</pre>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Después</h2>
          <pre className="overflow-x-auto rounded-xl bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{prettyJSON(entry.newValues)}</pre>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Metadatos</h2>
        <pre className="overflow-x-auto rounded-xl bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{prettyJSON(entry.metadata)}</pre>
      </div>
    </div>
  );
}
