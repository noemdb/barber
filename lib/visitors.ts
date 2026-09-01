/**
 * Helpers puros para la analítica de visitantes.
 * Sin dependencias de Prisma — unit-testeables en `lib/visitors.test.ts`.
 */

// Hosts de buscadores usados para clasificar el tráfico como orgánico.
const SEARCH_ENGINE_FRAGMENTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "yandex.", "baidu.", "ecosia."];

/** ¿El referrer proviene de un buscador? (tráfico orgánico). */
export function isSearchEngineHost(referrer: string | null | undefined): boolean {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return SEARCH_ENGINE_FRAGMENTS.some((fragment) => host.includes(fragment));
  } catch {
    // URL inválida (referrer malformado) → no es orgánico, no se lanza excepción.
    return false;
  }
}

/**
 * Semántica de fuente (estándar, corrige la superposición del spec):
 * - DIRECT   → sin referrer
 * - ORGANIC  → referrer de buscador (`true`)
 * - REFERRAL → referrer externo no buscador (`false`)
 */
export function detectOrganic(referrer: string | null | undefined): boolean {
  return isSearchEngineHost(referrer);
}

/** Formatea segundos como `"4m 12s"` / `"45s"` / `"0s"`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total <= 0) return "0s";
  const m = Math.floor(total / 60);
  const r = total % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

/** Una sesión rebota si el visitante no navegó más de una página. */
export function computeBounce(pagesViewed: number): boolean {
  return pagesViewed <= 1;
}
