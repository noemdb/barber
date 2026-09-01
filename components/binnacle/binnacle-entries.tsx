const severityColors: Record<string, string> = {
  DEBUG: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  INFO: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  ALERT: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

export type BinnacleEntry = {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  description?: string | null;
  subjectType?: string | null;
  subjectIdentifier?: string | null;
  subjectId?: string | null;
  objectType?: string | null;
  objectIdentifier?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
};

export function BinnacleEntries({
  entries,
  emptyText = "No hay eventos en la bitácora.",
  linkHref,
  footer,
}: {
  entries: BinnacleEntry[];
  emptyText?: string;
  linkHref?: (id: string) => string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Severidad</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const title = linkHref ? (
                  <a
                    href={linkHref(entry.id)}
                    className="inline-block font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
                  >
                    {entry.title}
                  </a>
                ) : (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.title}</span>
                );
                return (
                  <tr key={entry.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">
                      {new Date(entry.createdAt).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{title}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{entry.eventType}</div>
                      {entry.description && (
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{entry.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${severityColors[entry.severity] ?? severityColors.INFO}`}
                      >
                        {entry.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">
                      <div>{entry.subjectIdentifier ?? entry.subjectType ?? "Sistema"}</div>
                      {entry.objectIdentifier && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{entry.objectIdentifier}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">{entry.ipAddress ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
