import { z } from "zod";

/**
 * Forma de un archivo de backup generado por `POST /api/db/backup`.
 *
 * Las filas de cada tabla se dejan como `unknown[]`: su forma depende del esquema de Prisma
 * y se validan/castean al volcarlas con `createMany` en la restauración (se preservan los `id`
 * del backup para mantener la integridad referencial). Aquí solo se garantiza la estructura
 * externa del JSON: un objeto `tables` cuyos valores son arrays de objetos.
 */
export const dbDumpSchema = z.object({
  exportedAt: z.string().optional(),
  app: z.string().optional(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type DbDump = z.infer<typeof dbDumpSchema>;
