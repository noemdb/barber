import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { verify } from "@/prisma/seed-hash";
import { DomainError, ErrorCodes } from "@/lib/errors";

const COOKIE = "barberservice_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");

type Session = { sub: string; role: string; name: string; email: string };

export async function createSession(user: Session) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: String(payload.sub), role: String(payload.role), name: String(payload.name), email: String(payload.email) };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new DomainError(ErrorCodes.UNAUTHORIZED, "No autorizado", 401);
  return session;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active || !(await verify(password, user.passwordHash))) return null;
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}
