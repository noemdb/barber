import { describe, expect, it } from "vitest";
import { clientCreateSchema, clientPatchSchema } from "@/lib/validations";

describe("client validation", () => {
  it("accepts avatar URL when creating a client", () => {
    const result = clientCreateSchema.safeParse({
      name: "Ana López",
      phone: "555123456",
      email: "ana@example.com",
      notes: "Cliente frecuente",
      avatar: "https://utfs.io/f/client-avatar.png",
    });

    expect(result.success).toBe(true);
  });

  it("allows avatar updates for existing clients", () => {
    const result = clientPatchSchema.safeParse({
      avatar: "https://utfs.io/f/client-avatar-2.png",
    });

    expect(result.success).toBe(true);
  });
});
