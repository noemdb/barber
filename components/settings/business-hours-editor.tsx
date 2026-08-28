"use client";

export type HourEntry = { dayOfWeek: number; openTime: string | null; closeTime: string | null };

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const inputClass =
  "h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-900 dark:text-zinc-100 [color-scheme:light_dark] outline-none";

export function BusinessHoursEditor({ value, onChange }: { value: HourEntry[]; onChange: (value: HourEntry[]) => void }) {
  const get = (day: number) => value.find((h) => h.dayOfWeek === day);
  const set = (day: number, open: boolean) => {
    onChange(
      value
        .map((h) =>
          h.dayOfWeek === day
            ? { ...h, openTime: open ? h.openTime ?? "09:00" : null, closeTime: open ? h.closeTime ?? "17:00" : null }
            : h,
        )
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    );
  };
  const patch = (day: number, p: Partial<HourEntry>) => onChange(value.map((h) => (h.dayOfWeek === day ? { ...h, ...p } : h)));

  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }, (_, day) => {
        const entry = get(day);
        const isOpen = Boolean(entry?.openTime && entry?.closeTime);
        return (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5"
          >
            <div className="w-28 text-xs font-medium text-zinc-700 dark:text-zinc-300">{DAYS[day]}</div>
            <button
              type="button"
              onClick={() => set(day, !isOpen)}
              className="h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-[11px] font-semibold transition-colors"
            >
              {isOpen ? "Abierto" : "Cerrado"}
            </button>
            {isOpen ? (
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="time"
                  value={entry?.openTime ?? ""}
                  onChange={(e) => patch(day, { openTime: e.target.value || null })}
                  className={inputClass}
                  aria-label={`Hora de apertura ${DAYS[day]}`}
                />
                <span className="text-xs text-zinc-400">—</span>
                <input
                  type="time"
                  value={entry?.closeTime ?? ""}
                  onChange={(e) => patch(day, { closeTime: e.target.value || null })}
                  className={inputClass}
                  aria-label={`Hora de cierre ${DAYS[day]}`}
                />
              </div>
            ) : (
              <span className="ml-auto text-xs text-zinc-400">No laborable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
