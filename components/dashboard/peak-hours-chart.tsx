type Props = {
  days: string[];
  hours: number[];
  counts: number[][];
};

const GOLD = "200,164,92";

export function PeakHoursChart({ days, hours, counts }: Props) {
  if (hours.length === 0 || days.length === 0) {
    return (
      <p className="grid h-52 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
        Sin horarios de apertura configurados.
      </p>
    );
  }

  const max = Math.max(1, ...counts.flat());

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: "3px" }}>
        <thead>
          <tr>
            <th className="w-9 text-right" />
            {hours.map((h) => (
              <th
                key={h}
                className="min-w-[30px] pb-1 text-center text-[10px] font-semibold text-zinc-400 dark:text-zinc-500"
              >
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, di) => (
            <tr key={day}>
              <td className="pr-1.5 text-right text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{day}</td>
              {hours.map((h, hi) => {
                const v = counts[di]?.[hi] ?? 0;
                const alpha = v === 0 ? 0.06 : 0.18 + 0.66 * Math.min(1, v / max);
                return (
                  <td
                    key={h}
                    className="h-8 min-w-[30px] rounded-md text-center text-[10px] font-semibold text-zinc-800 dark:text-zinc-200"
                    style={{ backgroundColor: `rgba(${GOLD}, ${alpha})` }}
                    title={`${day} ${String(h).padStart(2, "0")}:00 — ${v} cita${v !== 1 ? "s" : ""}`}
                  >
                    {v > 0 ? v : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
