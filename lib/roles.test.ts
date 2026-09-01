import { describe, expect, it } from "vitest";
import { ROLE_HOME, homeForRole, isRoleAllowed } from "@/lib/roles";
import type { UserRole } from "@/app/generated/prisma/client";

describe("roles", () => {
  it.each(Object.keys(ROLE_HOME) as UserRole[])(
    "%s puede ver su home (sin loop de redirección)",
    (role) => {
      expect(isRoleAllowed(ROLE_HOME[role], role)).toBe(true);
    },
  );

  it("homeForRole resuelve el home por rol con fallback /", () => {
    expect(homeForRole("OWNER")).toBe("/dashboard");
    expect(homeForRole("ADMIN")).toBe("/dashboard");
    expect(homeForRole("BARBER")).toBe("/barber");
    expect(homeForRole("CLIENT")).toBe("/reservations");
    expect(homeForRole("UNKNOWN")).toBe("/");
  });

  it("isRoleAllowed niega roles ajenos por prefijo", () => {
    expect(isRoleAllowed("/dashboard", "BARBER")).toBe(false);
    expect(isRoleAllowed("/barber", "ADMIN")).toBe(false);
    expect(isRoleAllowed("/barber/agenda", "BARBER")).toBe(true);
    expect(isRoleAllowed("/reservations", "CLIENT")).toBe(true);
    expect(isRoleAllowed("/reservations/historial", "CLIENT")).toBe(true);
    expect(isRoleAllowed("/settings/binnacle", "OWNER")).toBe(true);
    expect(isRoleAllowed("/settings/binnacle", "BARBER")).toBe(false);
  });

  it("las rutas no declaradas siguen siendo públicas", () => {
    expect(isRoleAllowed("/", "CLIENT")).toBe(true);
    expect(isRoleAllowed("/terminos", "ADMIN")).toBe(true);
    expect(isRoleAllowed("/login", "BARBER")).toBe(true);
  });
});
