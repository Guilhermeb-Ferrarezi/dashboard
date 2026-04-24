import dns from "node:dns/promises";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import projectRoutes from "./routes/projects.routes";
import ssoRoutes from "./routes/sso.routes";
import valorantRoutes from "./routes/valorant.routes";
import vctRoutes from "./routes/vct.routes";
import { verifyJWT } from "./middlewares/jwe";
import { requireRole } from "./middlewares/role";

dotenv.config();

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
      ["3000", "3001", "3002", "5173"].includes(url.port)
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

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sso", ssoRoutes);
app.use("/api/valorant-account", valorantRoutes);
app.use("/api/vct", vctRoutes);

app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get("/api/user", verifyJWT, requireRole("user"), (_req, res) => {
  res.json({ message: "Area do usuario liberada." });
});

app.get("/api/admin", verifyJWT, requireRole("admin"), (_req, res) => {
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
    app.listen(port, () => {
      console.log(`Backend rodando: http://localhost:${port}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao conectar ao Mongo: ${message}`);
    process.exit(1);
  }
}

void start();
