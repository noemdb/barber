import { requireRoleOrRedirect } from "@/lib/permissions";
import { ManualTabs } from "@/components/manual/manual-tabs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const MANUAL_DIR = join(process.cwd(), "docs", "manual");

async function readManual(name: string): Promise<string> {
  try {
    return await readFile(join(MANUAL_DIR, `${name}.md`), "utf-8");
  } catch {
    return `No se encontró el manual \`${name}.md\`.`;
  }
}

export default async function ManualesPage() {
  await requireRoleOrRedirect("OWNER", "ADMIN");

  const [admin, barber, client] = await Promise.all([
    readManual("admin"),
    readManual("barber"),
    readManual("client"),
  ]);

  return <ManualTabs manuals={{ admin, barber, client }} />;
}
