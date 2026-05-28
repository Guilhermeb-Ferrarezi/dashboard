import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";
const LOGS_HTTP_COLLECTION =
  process.env.LOGS_HTTP_COLLECTION?.trim() || "santos_tech_home_logs";
const LOGS_ROUTE_BLACKLIST = (
  process.env.LOGS_ROUTE_BLACKLIST?.split(",") || ["/api/logs", "/api/portal/recents"]
).map((route) => route.trim()).filter(Boolean);
const LOGS_GET_ROUTE_BLACKLIST = (
  process.env.LOGS_GET_ROUTE_BLACKLIST?.split(",") || [
    "/api/user/me",
    "/api/vct",
    "/api/health/sse",
  ]
).map((route) => route.trim()).filter(Boolean);

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /pass(word)?|token|secret|authorization|cookie|session|key/i;

type JsonLike =
  | null
  | string
  | number
  | boolean
  | JsonLike[]
  | { [key: string]: JsonLike };

export function shouldSkipLogging(req: Pick<Request, "originalUrl" | "method">) {
  if (LOGS_ROUTE_BLACKLIST.some((route) => req.originalUrl.startsWith(route))) {
    return true;
  }

  if (
    req.method === "GET" &&
    LOGS_GET_ROUTE_BLACKLIST.some((route) => req.originalUrl.startsWith(route))
  ) {
    return true;
  }

  return false;
}

function shouldPersistLog(method: string, statusCode: number) {
  if (method !== "GET") {
    return true;
  }

  if (statusCode >= 400) {
    return true;
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeValue(
  value: unknown,
  seen = new WeakSet<object>(),
): JsonLike {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen));
  }

  if (!isPlainObject(value)) {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  const result: Record<string, JsonLike> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = REDACTED;
      continue;
    }

    result[key] = sanitizeValue(entry, seen);
  }

  return result;
}

function extractIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip || "";
  }

  return req.ip || "";
}

function getLogsCollection() {
  return mongoose.connection
    .getClient()
    .db(LOGS_DB_NAME)
    .collection(LOGS_HTTP_COLLECTION);
}

export function requestLogsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (shouldSkipLogging(req)) {
    next();
    return;
  }

  const startedAt = Date.now();
  const requestSnapshot = {
    params: sanitizeValue(req.params),
    query: sanitizeValue(req.query),
    body: sanitizeValue(req.body),
    headers: sanitizeValue({
      "content-type": req.headers["content-type"] ?? null,
      "user-agent": req.headers["user-agent"] ?? null,
      origin: req.headers.origin ?? null,
      referer: req.headers.referer ?? null,
      authorization: req.headers.authorization ?? null,
      cookie: req.headers.cookie ?? null,
    }),
  };

  let responseBody: unknown = null;

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response["json"];

  res.send = ((body: unknown) => {
    if (responseBody === null) {
      responseBody = body;
    }

    return originalSend(body);
  }) as Response["send"];

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;

    if (!shouldPersistLog(req.method, res.statusCode)) {
      return;
    }

    const routePath =
      typeof req.route?.path === "string"
        ? req.baseUrl
          ? `${req.baseUrl}${req.route.path}`
          : req.route.path
        : undefined;

    const user =
      req.user
        ? {
            id: req.user.id,
            name: req.user.username,
            email: req.user.email ?? null,
            role: req.user.role,
          }
        : null;

    const logEntry = {
      type: "http_request",
      occurredAt: new Date().toISOString(),
      method: req.method,
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      path: req.path,
      route: routePath ?? req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: extractIp(req),
      hostname: req.hostname,
      userAgent: req.get("user-agent") ?? null,
      user,
      requestBody: sanitizeValue(req.body),
      responseBody: sanitizeValue(responseBody),
      request: requestSnapshot,
      response: {
        statusCode: res.statusCode,
        body: sanitizeValue(responseBody),
      },
    };

    void getLogsCollection().insertOne(logEntry).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Falha ao salvar log HTTP: ${message}`);
    });
  });

  next();
}
