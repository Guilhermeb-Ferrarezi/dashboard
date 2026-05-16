import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function resolveWorkspaceRoot() {
  const configured = process.env.CODEX_WORKSPACE_ROOT?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  const cwd = process.cwd();
  return path.basename(cwd) === "api" ? path.resolve(cwd, "..") : cwd;
}

export function resolveCodexHome() {
  const configured = process.env.CODEX_HOME?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(resolveWorkspaceRoot(), ".codex-home");
}

export function getCodexServiceTokenPath() {
  return path.join(resolveCodexHome(), "codex_service_token");
}

function generateCodexServiceToken() {
  return `codex_${crypto.randomBytes(32).toString("base64url")}`;
}

export function resolveCodexServiceToken() {
  const existing =
    process.env.CODEX_INTERNAL_API_TOKEN?.trim() ||
    process.env.CODEX_ACCESS_TOKEN?.trim();

  if (existing) {
    return existing;
  }

  const tokenPath = getCodexServiceTokenPath();

  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, "utf8").trim();
    if (token) {
      return token;
    }
  }

  const token = generateCodexServiceToken();
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });

  return token;
}

export function readCodexServiceTokenFromRequest(headers: {
  authorization?: string | null;
  "x-codex-access-token"?: string | null;
}) {
  const headerToken = headers["x-codex-access-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}
