"use client";
import { useEffect, useRef } from "react";

const FP_COOKIE = "visitor_fp";

/** Lee o crea un fingerprint anónimo persistido en cookie (1 año). */
function readFingerprint(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${FP_COOKIE}=([^;]*)`));
  if (match && match[1]) return decodeURIComponent(match[1]);

  const fp = crypto.randomUUID();
  document.cookie = `${FP_COOKIE}=${encodeURIComponent(fp)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  return fp;
}

/**
 * Beacon invisible de analítica de visitantes para la landing.
 * - Al montar: registra la vista (`type: "view"`) con ruta, referrer y fingerprint.
 * - Al salir (`pagehide`): envía la duración de la sesión (`type: "duration"`).
 * Render `null`: no pinta UI.
 */
export function VisitTracker() {
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const fp = readFingerprint();
    startRef.current = Date.now();

    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "view",
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        fingerprint: fp,
      }),
      keepalive: true,
    }).catch(() => {});

    const sendDuration = () => {
      if (startRef.current == null) return;
      const elapsedMs = Date.now() - startRef.current;
      const payload = JSON.stringify({ type: "duration", fingerprint: fp, elapsedMs });

      try {
        navigator.sendBeacon(
          "/api/visits",
          new Blob([payload], { type: "application/json" }),
        );
      } catch {
        fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("pagehide", sendDuration);

    return () => window.removeEventListener("pagehide", sendDuration);
  }, []);

  return null;
}
