import { money } from "@/lib/format";

type BarberPerf = {
  id: string;
  name: string;
  citas: number;
  completadas: number;
  revenueCents: number;
  avgTicketCents: number;
  occupationPct: number;
};

type Props = {
  barbers: BarberPerf[];
  currency: string;
};

export function BarberPerformance({ barbers, currency }: Props) {
  if (barbers.length === 0) {
    return (
      <p className="grid h-48 place-items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
        Sin citas en el periodo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {barbers.map((b) => (
        <div key={b.id}>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-900 dark:text-zinc-100">
            <strong className="truncate">{b.name}</strong>
            <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
              {b.citas} cita{b.citas !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-gold"
              style={{ width: `${Math.min(100, Math.max(0, b.occupationPct))}%` }}
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>{b.occupationPct}% ocupación</span>
            <span aria-hidden>·</span>
            <span>ticket {money(b.avgTicketCents, currency)}</span>
            <span aria-hidden>·</span>
            <span>{money(b.revenueCents, currency)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
