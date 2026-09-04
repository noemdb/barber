"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { initials } from "@/lib/format";

type BarberData = {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  avatar: string | null;
};

type BarberStatus = {
  label: string;
  dotClass: string;
  textClass: string;
  busyUntilLabel?: string;
};

export default function BarberCard({
  barber,
  index,
  status,
}: {
  barber: BarberData;
  index: number;
  status: BarberStatus | null;
}) {
  function openBooking() {
    window.dispatchEvent(
      new CustomEvent("barber:open-booking", {
        detail: { barberId: barber.id },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={openBooking}
      aria-label={`Reservar con ${barber.name}`}
      className="group relative flex w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 sm:gap-4 sm:p-4"
    >
      <ArrowRight
        size={16}
        className="absolute right-3 top-3 text-gold opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark font-display text-sm font-semibold text-zinc-950 shadow-[0_4px_20px_var(--gold-glow-25)] transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14">
        {barber.avatar ? (
          <Image
            src={barber.avatar}
            alt={barber.name}
            width={100}
            height={100}
            loading={index < 2 ? "eager" : "lazy"}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="text-zinc-950/60">{initials(barber.name)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-medium uppercase tracking-tight sm:text-lg">
          {barber.name}
        </div>
        {barber.specialty && (
          <div className="mt-0.5 min-w-0 break-words text-[9px] uppercase tracking-[0.15em] text-zinc-400 sm:text-[11px]">
            {barber.specialty}
          </div>
        )}
        {barber.phone && (
          <div className="mt-1 hidden text-[10px] text-zinc-400 sm:block sm:text-xs">
            {barber.phone}
          </div>
        )}
        {status && (
          <span className={`mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-medium ${status.textClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
            {status.label}
            {status.busyUntilLabel && <span className="text-zinc-400">{status.busyUntilLabel}</span>}
          </span>
        )}
      </div>
    </button>
  );
}
