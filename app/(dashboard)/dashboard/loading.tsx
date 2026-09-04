export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header + filtros */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="h-7 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`f-${i}`} className="h-9 w-44 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="mt-4 h-7 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Agenda */}
      <div className="grid xl:grid-cols-[minmax(0,1.7fr)_330px] gap-4">
        <div className="h-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
        <div className="h-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-5 h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="mt-4 h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
