import { requireRoleOrRedirect } from "@/lib/permissions";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Markdown } from "@/components/manual/markdown";

export const dynamic = "force-dynamic";

const MANUAL_DIR = join(process.cwd(), "docs", "manual");

async function readBarberManual(): Promise<string> {
  try {
    return await readFile(join(MANUAL_DIR, "barber.md"), "utf-8");
  } catch {
    return `No se encontró el manual de barbero \`barber.md\`.`;
  }
}

export default async function BarberManualPage() {
  await requireRoleOrRedirect("BARBER");

  const barberManual = await readBarberManual();

  return (
    <div className="space-y-6">
      {/* ── Hero con identidad ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-gold/10 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gold/15 blur-3xl dark:bg-gold/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-gold dark:bg-gold dark:text-zinc-950">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors">
                <circle cx="6" cy="6" r="3"></circle><path d="M8.12 8.12 12 12"></path><path d="M20 4 8.12 15.88"></path><circle cx="6" cy="18" r="3"></circle><path d="M14.8 14.8 20 20"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Manual del Barbero
              </h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                Guía de uso para el portal del barbero. Aquí encontrarás información sobre cómo gestionar tus citas, ver tus clientes y llevar tu bitácora.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel del contenido ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
        <div className="bg-white p-6 dark:bg-zinc-950 sm:p-8">
          <Markdown source={barberManual} />
        </div>
      </div>
    </div>
  );
}