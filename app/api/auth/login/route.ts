import { withApi } from "@/lib/api";
import { DomainError, ErrorCodes } from "@/lib/errors";
import { authenticate, createSession, isSecureRequest } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { logAuthEvent, resolveSubject } from "@/lib/binnacle";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = loginSchema.parse(await request.json().catch(() => null));
    const user = await authenticate(body.email, body.password);

    if (!user) {
      await logAuthEvent({
        eventType: "login_failed",
        actor: { email: body.email },
        request,
        title: "Intento de inicio de sesión fallido",
        description: "Se rechazó un intento de acceso con credenciales inválidas.",
        status: "failure",
      });
      throw new DomainError(ErrorCodes.UNAUTHORIZED, "Credenciales inválidas", 401);
    }

    await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email }, isSecureRequest(request));
    const subject = resolveSubject({ id: user.id, email: user.email, role: user.role, name: user.name });

    await logAuthEvent({
      eventType: "login_success",
      actor: { id: user.id, email: user.email, role: user.role, name: user.name },
      request,
      title: "Inicio de sesión exitoso",
      description: `El usuario ${subject.identifier ?? user.email} inició sesión correctamente.`,
      status: "success",
    });

    return { data: { ok: true, role: user.role } };
  });
}