import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

export type BinnacleCategory =
  | "AUTHENTICATION"
  | "USER_ACTION"
  | "SYSTEM"
  | "SECURITY"
  | "ERROR";

export type BinnacleSeverity = "DEBUG" | "INFO" | "WARNING" | "CRITICAL" | "ALERT";

export type BinnacleEntryInput = {
  eventType: string;
  category?: BinnacleCategory;
  severity?: BinnacleSeverity;
  title: string;
  description?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  subjectIdentifier?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  objectIdentifier?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestUrl?: string | null;
  sessionId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedFields?: string[];
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

const allowedAuditFieldsByModel: Record<string, string[]> = {
  User: ["id", "name", "email", "role", "active", "createdAt", "updatedAt"],
  Barber: ["id", "name", "phone", "email", "specialty", "active", "avatar", "createdAt", "updatedAt"],
  Client: ["id", "name", "phone", "email", "notes", "active", "createdAt", "updatedAt"],
  Service: ["id", "name", "description", "durationMin", "priceCents", "active", "createdAt", "updatedAt"],
  Appointment: ["id", "startsAt", "endsAt", "status", "notes", "priceCents", "createdAt", "updatedAt"],
  Payment: ["id", "amountCents", "method", "status", "paidAt", "createdAt", "updatedAt"],
  BusinessSettings: ["id", "businessName", "phone", "email", "whatsapp", "address", "currency", "timezone", "updatedAt"],
};

const maskedAuditFields: Record<string, string[]> = {
  User: ["email"],
  Client: ["email", "phone"],
  Barber: ["email", "phone"],
  BusinessSettings: ["email", "phone", "whatsapp"],
};

const criticalSeverities = new Set<BinnacleSeverity>(["CRITICAL", "ALERT"]);

export function getAuditMask(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at > 0) {
    const local = trimmed.slice(0, 1);
    const domain = trimmed.slice(at + 1);
    return `${local}***@${domain}`;
  }
  if (trimmed.length <= 2) return `${trimmed[0] ?? ""}***`;
  return `${trimmed.slice(0, 1)}***${trimmed.slice(trimmed.length - 1)}`;
}

export function resolveSubject(
  actor?: { id?: string | null; email?: string | null; role?: string | null; name?: string | null },
): { type: string; id: string | null; identifier: string | null } {
  if (!actor) {
    return { type: "System", id: null, identifier: "system" };
  }
  const type = actor.role ? "User" : "System";
  const identifier = actor.email ?? actor.name ?? null;
  return { type, id: actor.id ?? null, identifier };
}

export function resolveRequestContext(input?: {
  request?: Request | { headers?: Headers | Record<string, string | undefined> } | null;
  sessionId?: string | null;
}): {
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  sessionId: string | null;
} {
  const request = input?.request;
  const headers = request instanceof Request ? request.headers : request && "headers" in request ? request.headers : undefined;

  const getHeader = (name: string): string | null => {
    if (!headers) return null;
    if (typeof Headers !== "undefined" && headers instanceof Headers) {
      return headers.get(name) ?? null;
    }
    if (typeof headers === "object") {
      const value = (headers as Record<string, string | undefined>)[name] ?? (headers as Record<string, string | undefined>)[name.toLowerCase()];
      return value ?? null;
    }
    return null;
  };

  const requestMethod = request && typeof request === "object" && "method" in request ? String(request.method) : null;
  const requestUrl = request && typeof request === "object" && "url" in request ? String(request.url) : null;

  const ipAddress = getHeader("x-forwarded-for") ?? getHeader("x-real-ip");
  const userAgent = getHeader("user-agent");

  return {
    ipAddress: ipAddress ? String(ipAddress).split(",")[0].trim() || null : null,
    userAgent: userAgent ? String(userAgent) : null,
    requestMethod: requestMethod ?? null,
    requestUrl: requestUrl ?? null,
    sessionId: input?.sessionId ?? null,
  };
}

export function buildAuditDiff(
  modelName: string,
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown>; changedFields: string[] } {
  const allowlist = allowedAuditFieldsByModel[modelName] ?? [];
  const masked = maskedAuditFields[modelName] ?? [];

  const rawBefore = (before ?? {}) as Record<string, unknown>;
  const rawAfter = (after ?? {}) as Record<string, unknown>;

  const normalize = (source: Record<string, unknown>, sourceType: "before" | "after") => {
    const out: Record<string, unknown> = {};
    for (const field of allowlist) {
      if (Object.prototype.hasOwnProperty.call(source, field)) {
        let value = source[field];
        if (masked.includes(field) && typeof value === "string") {
          value = getAuditMask(value);
        }
        out[field] = value;
      }
    }

    if (sourceType === "before") {
      for (const field of masked) {
        if (Object.prototype.hasOwnProperty.call(source, field) && typeof source[field] === "string") {
          out[field] = getAuditMask(String(source[field]));
        }
      }
    }

    return out;
  };

  const oldValues = normalize(rawBefore, "before");
  const newValues = normalize(rawAfter, "after");
  const changedFields = allowlist.filter((field) => {
    const oldV = rawBefore[field];
    const newV = rawAfter[field];
    return oldV !== newV;
  });

  return { oldValues, newValues, changedFields };
}

function buildEntry(input: BinnacleEntryInput): Prisma.BinnacleEntryUncheckedCreateInput {
  const entry: Prisma.BinnacleEntryUncheckedCreateInput = {
    eventType: input.eventType,
    category: input.category ?? "SYSTEM",
    severity: input.severity ?? "INFO",
    title: input.title,
    description: input.description ?? null,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null,
    subjectIdentifier: input.subjectIdentifier ?? null,
    objectType: input.objectType ?? null,
    objectId: input.objectId ?? null,
    objectIdentifier: input.objectIdentifier ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestMethod: input.requestMethod ?? null,
    requestUrl: input.requestUrl ?? null,
    sessionId: input.sessionId ?? null,
    changedFields: input.changedFields ?? [],
    createdBy: input.createdBy ?? null,
  };

  if (input.oldValues !== undefined) {
    entry.oldValues = input.oldValues as Prisma.InputJsonValue;
  }
  if (input.newValues !== undefined) {
    entry.newValues = input.newValues as Prisma.InputJsonValue;
  }
  if (input.metadata !== undefined) {
    entry.metadata = input.metadata as Prisma.InputJsonValue;
  }

  return entry;
}

export async function writeBinnacleEntry(input: BinnacleEntryInput): Promise<void> {
  const entry = buildEntry(input);
  await prisma.binnacleEntry.create({ data: entry });
}

export async function logBinnacleEvent(input: BinnacleEntryInput): Promise<void> {
  const entry = buildEntry(input);
  if (criticalSeverities.has(entry.severity as BinnacleSeverity)) {
    await writeBinnacleEntry(input);
    return;
  }

  after(async () => {
    await writeBinnacleEntry(input);
  });
}

export async function logModelMutation({
  modelName,
  action,
  before,
  after,
  actor,
  request,
  sessionId,
  title,
  description,
  objectId,
  objectType,
  category = "USER_ACTION",
  severity = "INFO",
}: {
  modelName: string;
  action: "created" | "updated" | "deleted";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actor?: { id?: string | null; email?: string | null; role?: string | null; name?: string | null };
  request?: Request | { headers?: Headers | Record<string, string | undefined> } | null;
  sessionId?: string | null;
  title: string;
  description?: string | null;
  objectId?: string | null;
  objectType?: string | null;
  category?: BinnacleCategory;
  severity?: BinnacleSeverity;
}): Promise<void> {
  const subject = resolveSubject(actor);
  const requestContext = resolveRequestContext({ request, sessionId });
  const diff = buildAuditDiff(modelName, before, after);
  const resolvedObjectId = objectId ?? (typeof before?.id === "string" ? before.id : null) ?? (typeof after?.id === "string" ? after.id : null) ?? null;

  await logBinnacleEvent({
    eventType: `${modelName.toLowerCase()}_${action}`,
    category,
    severity,
    title,
    description: description ?? `${modelName} ${action}`,
    subjectType: subject.type,
    subjectId: subject.id,
    subjectIdentifier: subject.identifier,
    objectType: objectType ?? modelName,
    objectId: resolvedObjectId,
    objectIdentifier: objectType ? String(resolvedObjectId ?? "") : null,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    requestMethod: requestContext.requestMethod,
    requestUrl: requestContext.requestUrl,
    sessionId: requestContext.sessionId,
    oldValues: diff.oldValues as Record<string, unknown>,
    newValues: diff.newValues as Record<string, unknown>,
    changedFields: diff.changedFields,
    metadata: { action, model: modelName },
    createdBy: actor?.id ?? null,
  });
}

export async function logAuthEvent({
  eventType,
  actor,
  request,
  sessionId,
  status,
  title,
  description,
}: {
  eventType: string;
  actor?: { id?: string | null; email?: string | null; role?: string | null; name?: string | null };
  request?: Request | { headers?: Headers | Record<string, string | undefined> } | null;
  sessionId?: string | null;
  status?: "success" | "failure";
  title: string;
  description?: string | null;
}): Promise<void> {
  const subject = resolveSubject(actor);
  const requestContext = resolveRequestContext({ request, sessionId });
  await logBinnacleEvent({
    eventType,
    category: "AUTHENTICATION",
    severity: status === "failure" ? "WARNING" : "INFO",
    title,
    description: description ?? `${eventType} ${status ?? "processed"}`,
    subjectType: subject.type,
    subjectId: subject.id,
    subjectIdentifier: subject.identifier,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    requestMethod: requestContext.requestMethod,
    requestUrl: requestContext.requestUrl,
    sessionId: requestContext.sessionId,
    metadata: { status: status ?? "unknown" },
    createdBy: actor?.id ?? null,
  });
}

export function serializeBinnacleExport<T extends Record<string, unknown>>(entries: T[], format: "csv" | "json") {
  const preferredOrder = [
    "eventType",
    "category",
    "severity",
    "title",
    "description",
    "subjectType",
    "subjectId",
    "subjectIdentifier",
    "objectType",
    "objectId",
    "objectIdentifier",
    "ipAddress",
    "userAgent",
    "requestMethod",
    "requestUrl",
    "sessionId",
    "createdBy",
    "createdAt",
    "id",
  ];

  const keys = Array.from(new Set(entries.flatMap((entry) => Object.keys(entry)))).sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  if (format === "json") {
    return JSON.stringify(entries, null, 2);
  }

  if (!entries.length) {
    return keys.length ? `${keys.join(",")}\n` : "";
  }

  const escapeCsv = (value: unknown) => {
    const text = value == null ? "" : String(value).replace(/\r?\n/g, " ").replace(/"/g, '""');
    return `"${text}"`;
  };

  const header = keys.join(",");
  const body = entries.map((entry) => keys.map((key) => escapeCsv(entry[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}
