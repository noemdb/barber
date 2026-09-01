import { withApi } from "@/lib/api";
import { destroySession, getSession } from "@/lib/auth";
import { logAuthEvent, resolveSubject } from "@/lib/binnacle";

export async function POST(request: Request) {
  return withApi(async () => {
    const session = await getSession();
    const subject = session
      ? resolveSubject({ id: session.sub, email: session.email, role: session.role, name: session.name })
      : resolveSubject();

    await destroySession();

    await logAuthEvent({
      eventType: "logout",
      actor: session ? { id: session.sub, email: session.email, role: session.role, name: session.name } : undefined,
      request,
      title: "Cierre de sesión",
      description: session ? `El usuario ${subject.identifier ?? session.email} cerró la sesión.` : "Se cerró una sesión anónima.",
      status: "success",
    });

    return { data: { ok: true } };
  });
}