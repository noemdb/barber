import { describe, expect, it } from "vitest";
import { serviceCreateSchema, servicePatchSchema } from "@/lib/validations";

describe("service validation", () => {
  it("accepts imageUrl for service creation", () => {
    const result = serviceCreateSchema.safeParse({
      name: "Corte premium",
      description: "Diseño y acabado profesional",
      imageUrl: "https://utfs.io/f/test-service.png",
      durationMin: 45,
      priceCents: 2500,
    });

    expect(result.success).toBe(true);
  });

  it("allows partial updates for service image and pricing", () => {
    const result = servicePatchSchema.safeParse({
      description: "Nuevo detalle",
      imageUrl: "https://utfs.io/f/test-service-2.png",
      priceCents: 3200,
    });

    expect(result.success).toBe(true);
  });
});
