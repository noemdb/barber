"use client";

import Image from "next/image";
import { ArrowRight, Clock, Scissors } from "lucide-react";
import { money } from "@/lib/format";

type ServiceCardData = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMin: number;
  priceCents: number;
};

export default function ServiceCard({
  service,
  index,
  currency,
}: {
  service: ServiceCardData;
  index: number;
  currency: string;
}) {
  function openBooking() {
    window.dispatchEvent(
      new CustomEvent("barber:open-booking", {
        detail: { serviceId: service.id },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={openBooking}
      aria-label={`Reservar ${service.name}`}
      className="group flex w-full cursor-pointer items-center gap-3 px-1 py-4 text-left transition-colors hover:bg-white/[0.03] sm:gap-5 md:px-4"
    >
      <span className="font-display text-xs font-semibold text-gold/70">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="order-1 min-w-0 flex-1 sm:order-none">
        <h3 className="font-display text-lg font-medium uppercase leading-tight tracking-tight md:text-xl">
          {service.name}
        </h3>
        {service.description && <p className="mt-0.5 text-[13px] text-zinc-500">{service.description}</p>}
        <div className="mt-1.5 flex items-center gap-4 sm:hidden">
          <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
            <Clock size={13} /> {service.durationMin} min
          </span>
          <span className="font-display text-base font-semibold text-gold">
            {money(service.priceCents, currency)}
          </span>
        </div>
      </div>
      <div className="order-2 shrink-0 sm:order-none">
        {service.imageUrl ? (
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-gold/20 bg-zinc-900 sm:h-12 sm:w-12">
            <Image src={service.imageUrl} alt={service.name} fill className="object-cover" sizes="(min-width: 640px) 48px, 56px" />
          </div>
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full border border-gold/20 bg-zinc-900 text-gold sm:h-12 sm:w-12">
            <Scissors size={16} />
          </div>
        )}
      </div>
      <div className="hidden items-center gap-5 sm:flex sm:gap-8">
        <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
          <Clock size={13} /> {service.durationMin} min
        </span>
        <span className="font-display text-base font-semibold text-gold md:text-lg">
          {money(service.priceCents, currency)}
        </span>
        <ArrowRight
          size={15}
          className="text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-gold"
        />
      </div>
    </button>
  );
}
