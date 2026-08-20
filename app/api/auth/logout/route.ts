import { withApi } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST() {
  return withApi(async () => {
    await destroySession();
    return { data: { ok: true } };
  });
}