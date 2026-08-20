import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Tests de integración: se requiere DATABASE_URL (cargar .env) y el dev server corriendo en " + BASE_URL,
  );
}

export const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

export type ApiJson = { success: boolean; data?: unknown; error?: { code?: string; message?: string } };
export type ApiResult = { status: number; json: ApiJson | null };

export class ApiClient {
  private cookie = "";
  constructor(private base = BASE_URL) {}

  private async request(path: string, init: RequestInit = {}): Promise<ApiResult> {
    const headers: Record<string, string> = {};
    if (init.body) headers["Content-Type"] = "application/json";
    if (this.cookie) headers["cookie"] = this.cookie;
    if (init.headers) Object.assign(headers, init.headers);
    const res = await fetch(this.base + path, { ...init, headers });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const text = await res.text();
    let json: ApiJson | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* cuerpo vacío o no JSON */
    }
    return { status: res.status, json };
  }

  get(path: string) {
    return this.request(path);
  }
  post(path: string, body: unknown) {
    return this.request(path, { method: "POST", body: JSON.stringify(body) });
  }
  patch(path: string, body: unknown) {
    return this.request(path, { method: "PATCH", body: JSON.stringify(body) });
  }
  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }
}