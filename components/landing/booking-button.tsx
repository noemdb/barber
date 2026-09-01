"use client";

import type { ReactNode } from "react";

export default function BookingButton({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("barber:open-booking"))}
      className={className}
    >
      {children}
    </button>
  );
}
