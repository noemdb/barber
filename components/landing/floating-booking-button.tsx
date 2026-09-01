"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CORNER = 28;

export default function FloatingBookingButton({ children }: { children: ReactNode }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [side, setSide] = useState<"left" | "right">("left");
  const [shift, setShift] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));

    let raf = 0;

    const measure = () => {
      const el = buttonRef.current;
      if (!el) return;
      const end = window.innerWidth - (CORNER * 2) - el.offsetWidth;
      setShift(side === "left" ? 0 : end);
    };

    const update = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let active = 0;
      for (let i = 0; i < sections.length; i++) {
        const { top, height } = sections[i].getBoundingClientRect();
        const absTop = top + window.scrollY;
        if (mid >= absTop && mid <= absTop + height) {
          active = i;
          break;
        }
      }
      setSide(active % 2 === 0 ? "left" : "right");

      const hero = sections[0];
      if (hero) {
        setVisible(window.scrollY + window.innerHeight > hero.offsetTop + hero.offsetHeight + 120);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    measure();
    update();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, [side]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("barber:open-booking"))}
      style={{
        transform: `translate(${visible ? shift : 0}px, ${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
      }}
      className="group fixed bottom-6 left-6 z-50 flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-zinc-950 shadow-[0_8px_30px_rgba(200,164,92,0.35)] transition-all duration-700 ease-out hover:bg-gold-light hover:shadow-[0_8px_30px_rgba(200,164,92,0.45)]"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      {children}
    </button>
  );
}
