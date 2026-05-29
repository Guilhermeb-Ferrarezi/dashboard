import dns from "node:dns/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import mongoose from "mongoose";
import dotenv from "dotenv";

import type { AppEnv } from "./types/hono";
import { errorHandler } from "./middlewares/error-handler";
import { requestLogsMiddleware } from "./middlewares/request-logs";
import { verifyJWTOrCodexServiceToken } from "./middlewares/codex-service-auth";
import { requireRole } from "./middlewares/role";

import { createYoga } from "graphql-yoga";
import { schema } from "./graphql/schema";
import { createGraphQLContext } from "./graphql/context";

import authRoutes from "./routes/auth.routes";
import devLoginRoutes from "./routes/dev-login.routes";
import adminRoutes from "./routes/admin.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import projectRoutes from "./routes/projects.routes";
import logsRoutes from "./routes/logs.routes";
import valorantRoutes from "./routes/valorant.routes";
import vctRoutes from "./routes/vct.routes";
import codexRoutes, { createCodexWsUpgradeHandler } from "./routes/codex.routes";
import portalRoutes from "./routes/portal.routes";
import checkoutRoutes from "./routes/checkout.routes";
import corujaoRoutes from "./routes/corujao.routes";
import corujaoPublicRoutes from "./routes/corujao-public.routes";
import mixPublicRoutes from "./routes/mix-public.routes";
import emailRoutes from "./routes/email.routes";
import analyticsRoutes from "./routes/analytics.routes";
import ssoRoutes from "./routes/sso.routes";

import { startPortalRecentsFlushLoop, stopPortalRecentsFlushLoop } from "./lib/portal-recents-store";
import { startHealthBroadcast, stopHealthBroadcast, addHealthClient } from "./lib/health-sse";
import { addClient as addVagasClient } from "./lib/vagas-sse";
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
import {
  codexWsOpen,
  codexWsMessage,
  codexWsClose,
} from "./lib/codex";
import { validateEnv } from "./config/env";

dotenv.config();
validateEnv();

process.on("uncaughtException", (err) => console.error("[process] uncaughtException:", err));
process.on("unhandledRejection", (reason) => console.error("[process] unhandledRejection:", reason));

const isProduction = process.env.NODE_ENV === "production";
const baseAllowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
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
      ]),
    );

const app = new Hono<AppEnv>();

app.use(
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowedOrigins.includes(origin)) return origin;
      if (!isProduction) {
        try {
          const url = new URL(origin);
          if (
            url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)
          ) {
            return origin;
          }
        } catch {
          /* ignore */
        }
      }
      return null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(compress({ encoding: "gzip" }));
app.use(requestLogsMiddleware);

// Rotas públicas e SSE
app.get("/api/health/sse", addHealthClient);
app.get("/api", (c) => c.json({ message: "Backend rodando!" }));

// Auth
app.route("/api/auth", authRoutes);

// DEV LOGIN BYPASS — só monta em non-production
if (!isProduction) {
  app.route("/api/dev", devLoginRoutes);
  console.log("⚠️  Dev login bypass habilitado em POST /api/dev/login");
}

// Rotas autenticadas
app.route("/api/admin", adminRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/logs", logsRoutes);
app.route("/api/valorant-account", valorantRoutes);
app.route("/api/vct", vctRoutes);
app.route("/api/codex", codexRoutes);
app.route("/api/portal", portalRoutes);
app.route("/api/checkout", checkoutRoutes);
app.route("/api/corujao/public", corujaoPublicRoutes);
app.route("/api/mix/public", mixPublicRoutes);
app.route("/api/corujao", corujaoRoutes);
app.route("/api/email", emailRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/sso", ssoRoutes);

// SSE de vagas
app.get("/api/corujao/public/vagas-sse", addVagasClient);

// Rotas de usuário autenticado
app.get("/api/user/me", verifyJWTOrCodexServiceToken, getCurrentUser);
app.put("/api/user/profile", verifyJWTOrCodexServiceToken, updateCurrentUserProfile);
app.put("/api/user/preferences", verifyJWTOrCodexServiceToken, updateCurrentUserPreferences);
app.get("/api/user/tokens", verifyJWTOrCodexServiceToken, listUserAccessTokensHandler);
app.post("/api/user/tokens", verifyJWTOrCodexServiceToken, createUserAccessTokenHandler);
app.post(
  "/api/user/tokens/:tokenId/revoke",
  verifyJWTOrCodexServiceToken,
  revokeUserAccessTokenHandler,
);
app.get(
  "/api/user/tokens/:tokenId/usage",
  verifyJWTOrCodexServiceToken,
  getUserTokenUsageHandler,
);
app.get(
  "/api/user",
  verifyJWTOrCodexServiceToken,
  requireRole("user"),
  (c) => c.json({ message: "Area do usuario liberada." }),
);

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  context: createGraphQLContext,
  graphiql: !isProduction,
});
app.on(["GET", "POST"], "/graphql", (c) => yoga.fetch(c.req.raw, c.env));

app.onError(errorHandler);

// ---------------------------------------------------------------------------
// Helpers Mongo
// ---------------------------------------------------------------------------

function extractMongoHost(uri: string) {
  return uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^:/?,]+)/)?.[1] ?? null;
}

function replaceMongoHost(uri: string, host: string) {
  return uri.replace(
    /^(mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?)([^:/?,]+)(.*)$/u,
    `$1${host}$3`,
  );
}

function describeMongoTarget(uri: string) {
  const m = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)(\/[^?]*)?/);
  return `${m?.[1] ?? "?"}${m?.[2] ?? ""}`;
}

function extractMongoDbName(uri: string) {
  const m = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?[^/?]+\/([^?]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

async function resolveMongoUri(uri: string): Promise<string> {
  if (isProduction || uri.startsWith("mongodb+srv://")) return uri;

  const originalHost = extractMongoHost(uri);
  if (!originalHost) return uri;

  if (["localhost", "127.0.0.1", "::1"].includes(originalHost)) {
    return originalHost === "localhost" ? replaceMongoHost(uri, "127.0.0.1") : uri;
  }

  try {
    await dns.lookup(originalHost);
    return uri;
  } catch {
    /* fallback */
  }

  const fallbackHost = process.env.MONGO_FALLBACK_HOST?.trim() || "127.0.0.1";
  console.warn(`Mongo host "${originalHost}" nao resolvido. Tentando "${fallbackHost}".`);
  return replaceMongoHost(uri, fallbackHost);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function start() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    console.error("MONGO_URI nao configurada.");
    process.exit(1);
  }

  const resolvedMongoUri = await resolveMongoUri(mongoUri);
  const dbName =
    process.env.MONGO_DB_NAME?.trim() || extractMongoDbName(resolvedMongoUri) || undefined;

  try {
    await mongoose.connect(resolvedMongoUri, {
      dbName,
      serverSelectionTimeoutMS:
        Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
    });
    console.log(`Mongo conectado em ${describeMongoTarget(resolvedMongoUri)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao conectar ao Mongo: ${message}`);
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 4000;

  // Referência ao server Bun (necessária para upgrade WS)
  let serverRef: ReturnType<typeof Bun.serve>;

  // Rota de upgrade WS do Codex (requer admin auth — aplicado antes de montar)
  const codexWsUpgrade = createCodexWsUpgradeHandler(() => serverRef);
  app.get(
    "/api/codex/ws",
    verifyJWTOrCodexServiceToken,
    requireRole("admin"),
    codexWsUpgrade,
  );

  serverRef = Bun.serve({
    port,
    fetch: app.fetch,
    websocket: {
      open: codexWsOpen,
      message: codexWsMessage,
      close: codexWsClose,
    },
  });

  console.log(`Backend rodando: http://localhost:${port}`);
  startPortalRecentsFlushLoop();
  startHealthBroadcast();

  function shutdown() {
    console.log("Shutting down…");
    stopPortalRecentsFlushLoop();
    stopHealthBroadcast();
    serverRef.stop();
    setTimeout(() => process.exit(1), 5000);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void start();
