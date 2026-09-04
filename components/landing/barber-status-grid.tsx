"use client";

import { useEffect, useState } from "react";
import BarberCard from "./barber-card";

type BarberLite = { id: string; name: string; specialty: string | null; phone: string | null; avatar: string | null };

type AvailabilityBarber = {
  id: string;
  status: "available-now" | "available-soon" | "busy" | "closed";
  busyUntil: string | null;
  freeSlots: string[];
};

type Status = { label: string; dotClass: string; textClass: string; busyUntilLabel?: string };

const STATUS_META: Record<AvailabilityBarber["status"], Status> = {
  "available-now": { label: "Disponible ahora", dotClass: "bg-emerald-400", textClass: "text-emerald-300" },
  "available-soon": { label: "Libre en 2h", dotClass: "bg-amber-400", textClass: "text-amber-300" },
  busy: { label: "Ocupado", dotClass: "bg-zinc-500", textClass: "text-zinc-400" },
  closed: { label: "Cerrado", dotClass: "bg-zinc-700", textClass: "text-zinc-400" },
};

function formatZoneTime(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

export default function BarberStatusGrid({
  barbers,
  timezone,
}: {
  barbers: BarberLite[];
  timezone: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, AvailabilityBarber>>({});

  useEffect(() => {
    let cancelled = false;
    const from = new Date();
    const to = new Date(from.getTime() + 2 * 60 * 60 * 1000);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    fetch(`/api/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const byId: Record<string, AvailabilityBarber> = {};
        for (const b of (json.data?.barbers ?? []) as AvailabilityBarber[]) byId[b.id] = b;
        setStatuses(byId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {barbers.map((barber, i) => {
        const a = statuses[barber.id];
        const status: Status | null = a
          ? {
              label: STATUS_META[a.status].label,
              dotClass: STATUS_META[a.status].dotClass,
              textClass: STATUS_META[a.status].textClass,
              busyUntilLabel:
                a.status === "busy" && a.busyUntil ? `hasta ${formatZoneTime(a.busyUntil, timezone)}` : undefined,
            }
          : null;
        return <BarberCard key={barber.id} barber={barber} index={i} status={status} />;
      })}
    </div>
  );
}
