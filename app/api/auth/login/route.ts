import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { authenticate, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = loginSchema.parse(await request.json().catch(() => null));
    const user = await authenticate(body.email, body.password);
    if (!user) throw new DomainError(ErrorCodes.UNAUTHORIZED, "Credenciales inválidas", 401);
    await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email });
    return { data: { ok: true, role: user.role } };
  });
}