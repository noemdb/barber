import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError, ErrorCodes } from "@/lib/errors";

export type ApiError = { success: false; error: { code: string; message: string } };
export type ApiSuccess<T> = { success: true; data: T };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json<ApiError>(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join("; ") || "Datos inválidos";
    return NextResponse.json<ApiError>(
      { success: false, error: { code: ErrorCodes.VALIDATION_ERROR, message } },
      { status: 400 },
    );
  }
  console.error("API error:", error);
  return NextResponse.json<ApiError>(
    { success: false, error: { code: ErrorCodes.INTERNAL_ERROR, message: "Error interno del servidor" } },
    { status: 500 },
  );
}

export async function withApi<T>(handler: () => Promise<{ data: T; status?: number }>): Promise<NextResponse> {
  try {
    const { data, status } = await handler();
    return ok(data, status ?? 200);
  } catch (error) {
    return apiError(error);
  }
}