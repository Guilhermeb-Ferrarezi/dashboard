import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import mongoose from "mongoose";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";
const LOGS_HTTP_COLLECTION = process.env.LOGS_HTTP_COLLECTION?.trim() || "santos_tech_home_logs";
const LOGS_ROUTE_BLACKLIST = new Set(
  (process.env.LOGS_ROUTE_BLACKLIST?.split(",") || ["/api/logs", "/api/portal/recents", "/graphql"])
    .map((r) => r.trim()).filter(Boolean),
);
const LOGS_GET_ROUTE_BLACKLIST = new Set(
  (process.env.LOGS_GET_ROUTE_BLACKLIST?.split(",") || ["/api/user/me", "/api/vct", "/api/health/sse"])
    .map((r) => r.trim()).filter(Boolean),
);

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /pass(word)?|token|secret|authorization|cookie|session|key/i;

type JsonLike = null | string | number | boolean | JsonLike[] | { [key: string]: JsonLike };

export function shouldSkipLogging(req: { originalUrl: string; method: string }) {
  if (Array.from(LOGS_ROUTE_BLACKLIST).some((r) => req.originalUrl.startsWith(r))) return true;
  if (req.method === "GET" && Array.from(LOGS_GET_ROUTE_BLACKLIST).some((r) => req.originalUrl.startsWith(r))) return true;
  return false;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): JsonLike {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (Array.isArray(value)) return value.map((e) => sanitizeValue(e, seen));
  if (!isPlainObject(value)) return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  const result: Record<string, JsonLike> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(entry, seen);
  }
  return result;
}

function getLogsCollection() {
  return mongoose.connection.getClient().db(LOGS_DB_NAME).collection(LOGS_HTTP_COLLECTION);
}

export async function requestLogsMiddleware(c: Context<AppEnv>, next: Next) {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  const method = c.req.method;

  const skipAll = Array.from(LOGS_ROUTE_BLACKLIST).some((r) => pathname.startsWith(r));
  const skipGet = method === "GET" && Array.from(LOGS_GET_ROUTE_BLACKLIST).some((r) => pathname.startsWith(r));
  if (skipAll || skipGet) { await next(); return; }

  const startedAt = Date.now();
  let body: unknown = null;
  if (method !== "GET" && method !== "HEAD") {
    try { body = await c.req.json(); } catch { body = null; }
  }

  await next();

  const statusCode = c.res.status;
  if (method === "GET" && statusCode < 400) return;

  let responseBody: unknown = null;
  try {
    const clone = c.res.clone();
    const ct = clone.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) responseBody = await clone.json();
  } catch { /* ignore */ }

  const user = c.get("user");
  const logEntry = {
    type: "http_request",
    occurredAt: new Date().toISOString(),
    method,
    url: c.req.url,
    path: pathname,
    route: pathname,
    statusCode,
    durationMs: Date.now() - startedAt,
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    hostname: url.hostname,
    userAgent: c.req.header("user-agent") ?? null,
    user: user ? { id: user.id, name: user.username, email: user.email ?? null, role: user.role } : null,
    requestBody: sanitizeValue(body),
    responseBody: sanitizeValue(responseBody),
  };

  void getLogsCollection().insertOne(logEntry).catch((err) => {
    console.error(`Falha ao salvar log HTTP: ${err instanceof Error ? err.message : String(err)}`);
  });
}
