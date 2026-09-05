import { describe, expect, it } from "vitest";
import { barberCreateSchema, serviceCreateSchema } from "@/lib/validations";

const ids = ["cmj4w6x7b0000qwertyuiopas", "cmj4w6x7b0001qwertyuiopas"];

describe("Barber-Service relation validation", () => {
  it("accepts an empty relation list", () => {
    expect(barberCreateSchema.parse({ name: "Daniel", serviceIds: [] }).serviceIds).toEqual([]);
    expect(
      serviceCreateSchema.parse({ name: "Corte", durationMin: 30, priceCents: 1500, barberIds: [] }).barberIds,
    ).toEqual([]);
  });

  it("rejects duplicate service IDs", () => {
    const result = barberCreateSchema.safeParse({ name: "Daniel", serviceIds: [ids[0], ids[0]] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate barber IDs", () => {
    const result = serviceCreateSchema.safeParse({
      name: "Corte",
      durationMin: 30,
      priceCents: 1500,
      barberIds: [ids[1], ids[1]],
    });
    expect(result.success).toBe(false);
  });
});
