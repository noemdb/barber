import { describe, expect, it } from "vitest";
import { buildAuditDiff, getAuditMask, resolveSubject, resolveRequestContext, serializeBinnacleExport } from "@/lib/binnacle";

describe("buildAuditDiff", () => {
  it("solo incluye campos permitidos y enmascara emails sensibles", () => {
    const diff = buildAuditDiff("User", {
      id: "usr_1",
      email: "alice@example.com",
      name: "Alice",
      passwordHash: "super-secret",
      role: "ADMIN",
      active: true,
    }, {
      id: "usr_1",
      email: "alice+new@example.com",
      name: "Alice Jr",
      passwordHash: "super-secret-2",
      role: "OWNER",
      active: true,
    });

    expect(diff.oldValues).toMatchObject({ id: "usr_1", email: "a***@example.com", name: "Alice", role: "ADMIN", active: true });
    expect(diff.newValues).toMatchObject({ id: "usr_1", email: "a***@example.com", name: "Alice Jr", role: "OWNER", active: true });
    expect(diff.oldValues).not.toHaveProperty("passwordHash");
    expect(diff.newValues).not.toHaveProperty("passwordHash");
    expect(diff.changedFields).toContain("email");
    expect(diff.changedFields).toContain("name");
    expect(diff.changedFields).toContain("role");
  });
});

describe("getAuditMask", () => {
  it("muestra un valor enmascarado estable para emails", () => {
    expect(getAuditMask("hola@barberservice.com")).toBe("h***@barberservice.com");
    expect(getAuditMask("maria@x.com")).toBe("m***@x.com");
  });
});

describe("resolveSubject and resolveRequestContext", () => {
  it("construye subject e información de request de forma segura", () => {
    const subject = resolveSubject({ id: "usr_2", email: "barber@shop.com", role: "BARBER" });
    const requestContext = resolveRequestContext({
      request: new Request("https://example.com/api/auth/login", { headers: { "x-forwarded-for": "203.0.113.11", "user-agent": "Mozilla" } }),
      sessionId: "session_123",
    });

    expect(subject).toMatchObject({ type: "User", id: "usr_2", identifier: "barber@shop.com" });
    expect(requestContext.ipAddress).toBe("203.0.113.11");
    expect(requestContext.userAgent).toBe("Mozilla");
    expect(requestContext.sessionId).toBe("session_123");
  });
});

describe("serializeBinnacleExport", () => {
  it("genera CSV y JSON con los campos esperados", () => {
    const entries = [
      {
        id: "evt_1",
        eventType: "login_success",
        category: "AUTHENTICATION",
        severity: "INFO",
        title: "Inicio de sesión exitoso",
        description: "Usuario autenticado",
        subjectIdentifier: "barber@shop.com",
        objectType: "User",
        objectId: "usr_2",
        createdAt: "2026-09-01T10:00:00.000Z",
      },
    ];

    const csv = serializeBinnacleExport(entries, "csv");
    const json = serializeBinnacleExport(entries, "json");

    expect(csv).toContain("eventType,category,severity,title");
    expect(csv).toContain("login_success");
    expect(json).toContain('"eventType": "login_success"');
    expect(json).toContain("\"id\": \"evt_1\"");
  });
});
