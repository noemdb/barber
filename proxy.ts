import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ROUTE_RULES, homeForRole, isRoleAllowed } from "@/lib/roles";

const COOKIE = "barberservice_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;

  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      role = payload.role ? String(payload.role) : null;
    } catch {
      role = null;
    }
  }

  const isProtected = Object.keys(ROUTE_RULES).some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isProtected) {
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (!isRoleAllowed(pathname, role)) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/appointments/:path*",
    "/clients/:path*",
    "/barbers/:path*",
    "/services/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/visitantes/:path*",
    "/barber/:path*",
    "/reservations/:path*",
  ],
};
