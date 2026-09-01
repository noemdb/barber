import { z } from "zod";

/**
 * Payload del beacon de visitantes (`POST /api/visits`).
 * - `view`    → alta de sesión + page_view.
 * - `duration`→ acumula segundos en la sesión (beacon de salida).
 */
export const visitSchema = z.object({
  type: z.enum(["view", "duration"]),
  path: z.string().trim().optional(),
  referrer: z.string().trim().optional(),
  fingerprint: z.string().trim().min(1).max(64).optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
});

export type VisitInput = z.infer<typeof visitSchema>;
