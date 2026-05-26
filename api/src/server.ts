import dns from "node:dns/promises";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import projectRoutes from "./routes/projects.routes";
import logsRoutes from "./routes/logs.routes";
import ssoRoutes from "./routes/sso.routes";
import valorantRoutes from "./routes/valorant.routes";
import vctRoutes from "./routes/vct.routes";
import codexRoutes from "./routes/codex.routes";
import portalRoutes from "./routes/portal.routes";
import checkoutRoutes from "./routes/checkout.routes";
import corujaoRoutes from "./routes/corujao.routes";
import corujaoPublicRoutes from "./routes/corujao-public.routes";
import { runCheckoutMigrations } from "./db/index";
import { startPortalRecentsFlushLoop, stopPortalRecentsFlushLoop } from "./lib/portal-recents-store";
import {
  getCurrentUser,
  updateCurrentUserProfile,
  updateCurrentUserPreferences,
} from "./controllers/user.controller";
import {
  createUserAccessTokenHandler,
  getUserTokenUsageHandler,
  listUserAccessTokensHandler,
  revokeUserAccessTokenHandler,
} from "./controllers/user-access-token.controller";
import { verifyJWTOrCodexServiceToken } from "./middlewares/codex-service-auth";
import { requestLogsMiddleware } from "./middlewares/request-logs";
import { requireRole } from "./middlewares/role";
import { attachCodexGateway } from "./lib/codex";

dotenv.config();

process.on("uncaughtException", (error) => {
  console.error("[process] uncaughtException:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const baseAllowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];
const allowedOrigins = isProduction
  ? baseAllowedOrigins
  : Array.from(
      new Set([
        ...baseAllowedOrigins,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "http://[::1]:3000",
        "http://[::1]:3001",
        "http://[::1]:3002",
        "http://[::1]:5173",
      ]),
    );

function isAllowedLocalDevOrigin(origin: string) {
  if (isProduction) {
    return false;
  }

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      ["3000", "3001", "3002", "3003", "5173"].includes(url.port)
    );
  } catch {
    return false;
  }
}

function extractMongoHost(uri: string) {
  return uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^:/?,]+)/)?.[1] ?? null;
}

function shouldUseMongoFallbackHost(host: string) {
  if (["localhost", "127.0.0.1", "::1"].includes(host)) {
    return true;
  }

  return !host.includes(".");
}

function replaceMongoHost(uri: string, host: string) {
  return uri.replace(
    /^(mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?)([^:/?,]+)(.*)$/u,
    `$1${host}$3`,
  );
}

function describeMongoTarget(uri: string) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)(\/[^?]*)?/);
  const host = match?.[1] ?? "desconhecido";
  const dbPath = match?.[2] && match[2] !== "/" ? match[2] : "";

  return `${host}${dbPath}`;
}

function extractMongoDbName(uri: string) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?[^/?]+\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function resolveMongoUri(uri: string) {
  if (isProduction || uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  const originalHost = extractMongoHost(uri);
  const defaultFallbackHost = "127.0.0.1";

  if (!originalHost) {
    return uri;
  }

  if (["localhost", "127.0.0.1", "::1"].includes(originalHost)) {
    return originalHost === "localhost" ? replaceMongoHost(uri, defaultFallbackHost) : uri;
  }

  try {
    await dns.lookup(originalHost);
    return uri;
  } catch {
    if (!shouldUseMongoFallbackHost(originalHost)) {
      return uri;
    }

    const configuredFallbackHost = process.env.MONGO_FALLBACK_HOST?.trim();
    const fallbackHost =
      !configuredFallbackHost || configuredFallbackHost === "localhost"
        ? defaultFallbackHost
        : configuredFallbackHost;

    if (fallbackHost === originalHost) {
      return uri;
    }

    console.warn(
      `Mongo host "${originalHost}" nao foi resolvido neste ambiente. Tentando "${fallbackHost}" no lugar.`,
    );

    return replaceMongoHost(uri, fallbackHost);
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isAllowedLocalDevOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-sso-shared-secret"],
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(requestLogsMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/sso", ssoRoutes);
app.use("/api/valorant-account", valorantRoutes);
app.use("/api/vct", vctRoutes);
app.use("/api/codex", codexRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/corujao", corujaoRoutes);
app.use("/api/corujao/public", corujaoPublicRoutes);

app.get("/api/user/me", verifyJWTOrCodexServiceToken, getCurrentUser);
app.put("/api/user/profile", verifyJWTOrCodexServiceToken, updateCurrentUserProfile);
app.put("/api/user/preferences", verifyJWTOrCodexServiceToken, updateCurrentUserPreferences);
app.get("/api/user/tokens", verifyJWTOrCodexServiceToken, listUserAccessTokensHandler);
app.post("/api/user/tokens", verifyJWTOrCodexServiceToken, createUserAccessTokenHandler);
app.post("/api/user/tokens/:tokenId/revoke", verifyJWTOrCodexServiceToken, revokeUserAccessTokenHandler);
app.get("/api/user/tokens/:tokenId/usage", verifyJWTOrCodexServiceToken, getUserTokenUsageHandler);

app.get("/api/user", verifyJWTOrCodexServiceToken, requireRole("user"), (_req, res) => {
  res.json({ message: "Area do usuario liberada." });
});

app.get("/api/admin", verifyJWTOrCodexServiceToken, requireRole("admin"), (_req, res) => {
  res.json({ message: "Area administrativa liberada." });
});

app.get("/api", (_req, res) => res.json({ message: "Backend rodando!" }));

async function start() {
  const mongoUri = process.env.MONGO_URI?.trim();
  const configuredDbName = process.env.MONGO_DB_NAME?.trim();

  if (!mongoUri) {
    console.error("MONGO_URI nao configurada.");
    process.exit(1);
  }

  const serverSelectionTimeoutMS =
    Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000;

  try {
    const resolvedMongoUri = await resolveMongoUri(mongoUri);
    const dbName = configuredDbName || extractMongoDbName(resolvedMongoUri) || undefined;

    await mongoose.connect(resolvedMongoUri, {
      dbName,
      serverSelectionTimeoutMS,
    });

    const mongoTarget = dbName
      ? `${describeMongoTarget(resolvedMongoUri)} [db=${dbName}]`
      : describeMongoTarget(resolvedMongoUri);

    console.log(`Mongo conectado em ${mongoTarget}`);

    const port = Number(process.env.PORT) || 4000;
    const server = app.listen(port, () => {
      console.log(`Backend rodando: http://localhost:${port}`);
    });

    attachCodexGateway(server);
    startPortalRecentsFlushLoop();
    // runCheckoutMigrations() desativado em 2026-05-26 — todas as 5
    // operações estão cobertas pelas migrations Drizzle 0003/0004/0008.
    // Função preservada em db/index.ts (@deprecated) por 1-2 sessões pra
    // rollback de emergência; remover depois.
    // runCheckoutMigrations().catch((err) =>
    //   console.error("[checkout] migration error:", err)
    // );

    function shutdown() {
      console.log("Shutting down…");
      stopPortalRecentsFlushLoop();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000);
    }
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao conectar ao Mongo: ${message}`);
    process.exit(1);
  }
}

void start();
