import { describe, it, expect } from "vitest";
import { isSearchEngineHost, detectOrganic, formatDuration, computeBounce } from "@/lib/visitors";

describe("isSearchEngineHost", () => {
  it("detecta buscadores conocidos", () => {
    expect(isSearchEngineHost("https://www.google.com/search?q=barbería")).toBe(true);
    expect(isSearchEngineHost("https://www.bing.com/search?q=x")).toBe(true);
    expect(isSearchEngineHost("https://duckduckgo.com/?q=x")).toBe(true);
    expect(isSearchEngineHost("https://www.google.es/search?q=x")).toBe(true);
  });

  it("devuelve false para referrer externo que no es buscador", () => {
    expect(isSearchEngineHost("https://example.com/page")).toBe(false);
    expect(isSearchEngineHost("https://www.instagram.com/barber")).toBe(false);
  });

  it("devuelve false para referrer vacío o inválido sin lanzar", () => {
    expect(isSearchEngineHost("")).toBe(false);
    expect(isSearchEngineHost(null)).toBe(false);
    expect(isSearchEngineHost(undefined)).toBe(false);
    expect(isSearchEngineHost("esto no es una url")).toBe(false);
    expect(isSearchEngineHost("google")).toBe(false);
  });
});

describe("detectOrganic", () => {
  it("true solo si el referrer es buscador", () => {
    expect(detectOrganic("https://www.google.com/search?q=x")).toBe(true);
    expect(detectOrganic("")).toBe(false);
    expect(detectOrganic("https://example.com")).toBe(false);
    expect(detectOrganic(null)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("formatea a minutos y segundos", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(252)).toBe("4m 12s");
    expect(formatDuration(60)).toBe("1m 0s");
  });

  it("clampa negativos y no genera valores negativos", () => {
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("computeBounce", () => {
  it("rebota con una página o menos", () => {
    expect(computeBounce(1)).toBe(true);
    expect(computeBounce(0)).toBe(true);
  });

  it("no rebota con más de una página", () => {
    expect(computeBounce(2)).toBe(false);
    expect(computeBounce(5)).toBe(false);
  });
});
