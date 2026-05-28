import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";
import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";
import { verifySessionToken } from "../lib/session-token";
import { authenticateUserAccessToken, hashUserAccessToken, logUserTokenUsage } from "../lib/user-access-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

function readAuthToken(c: Context<AppEnv>): string | null {
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME);
  if (typeof cookieToken === "string" && cookieToken.trim()) return cookieToken.trim();
  const authHeader = c.req.header("authorization");
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return null;
}

export async function verifyJWTOrCodexServiceToken(c: Context<AppEnv>, next: Next) {
  const authToken = readAuthToken(c);

  if (authToken) {
    const session = await verifySessionToken(authToken, process.env.JWT_SECRET!);
    if (session) {
      c.set("user", {
        id: String(session.userId),
        username: session.login,
        email: session.email,
        role: session.role === ADMIN_ROLE ? "admin" : "user",
        authType: "session",
      });
      await next();
      return;
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: c.req.header("authorization"),
    "x-codex-access-token": c.req.header("x-codex-access-token"),
  });

  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    const delegatedUserId = c.req.header("x-codex-user-id")?.trim() ?? "";

    if (!delegatedUserId) {
      c.set("user", { id: "codex-service", username: "codex-agent", role: "admin", authType: "service" });
      await next();
      return;
    }

    const delegatedToken = c.req.header("x-codex-user-token");
    if (delegatedToken) {
      const session = await verifySessionToken(delegatedToken, process.env.JWT_SECRET!);
      if (session) {
        c.set("user", {
          id: String(session.userId),
          username: session.login,
          email: session.email,
          role: session.role === ADMIN_ROLE ? "admin" : "user",
          authType: "service",
        });
        await next();
        return;
      }
    }
    return c.json({ message: "Invalid delegated user" }, 403);
  }

  if (authToken) {
    const authenticatedUserToken = await authenticateUserAccessToken(authToken);
    if (authenticatedUserToken) {
      c.set("user", {
        ...authenticatedUserToken.user,
        authType: "token",
        tokenPermissions: authenticatedUserToken.token.permissions ?? [],
      });
      void logUserTokenUsage({
        tokenId: authenticatedUserToken.token.id,
        tokenHash: hashUserAccessToken(authToken),
        userId: authenticatedUserToken.token.userId,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      });
      await next();
      return;
    }
  }

  if (!authToken && !serviceToken) return c.json({ message: "Missing token" }, 401);
  return c.json({ message: "Invalid or expired token" }, 403);
}
