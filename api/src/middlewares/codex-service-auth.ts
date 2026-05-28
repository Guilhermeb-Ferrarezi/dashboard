import type { NextFunction, Request, Response } from "express";

import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";
import { verifySessionToken } from "../lib/session-token";
import { authenticateUserAccessToken, hashUserAccessToken, logUserTokenUsage } from "../lib/user-access-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

function readAuthToken(req: Request) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

export async function verifyJWTOrCodexServiceToken(req: Request, res: Response, next: NextFunction) {
  const authToken = readAuthToken(req);

  if (authToken) {
    const session = await verifySessionToken(authToken, process.env.JWT_SECRET!);

    if (session) {
      req.user = {
        id: String(session.userId),
        username: session.login,
        email: session.email,
        role: session.role === ADMIN_ROLE ? "admin" : "user",
        authType: "session",
      };
      return next();
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: req.headers.authorization,
    "x-codex-access-token": req.headers["x-codex-access-token"] as string | null | undefined,
  });

  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    const delegatedUserId =
      typeof req.headers["x-codex-user-id"] === "string"
        ? req.headers["x-codex-user-id"].trim()
        : "";

    if (!delegatedUserId) {
      req.user = {
        id: "codex-service",
        username: "codex-agent",
        role: "admin",
        authType: "service",
      };
      return next();
    }

    try {
      const delegatedToken = req.headers["x-codex-user-token"] as string | undefined;
      if (delegatedToken) {
        const session = await verifySessionToken(delegatedToken, process.env.JWT_SECRET!);
        if (session) {
          req.user = {
            id: String(session.userId),
            username: session.login,
            email: session.email,
            role: session.role === ADMIN_ROLE ? "admin" : "user",
            authType: "service",
          };
          return next();
        }
      }
      return res.status(403).json({ message: "Invalid delegated user" });
    } catch {
      return res.status(403).json({ message: "Invalid delegated user" });
    }
  }

  if (authToken) {
    const authenticatedUserToken = await authenticateUserAccessToken(authToken);

    if (authenticatedUserToken) {
      req.user = {
        ...authenticatedUserToken.user,
        authType: "token",
        tokenPermissions: authenticatedUserToken.token.permissions ?? [],
      };
      void logUserTokenUsage({
        tokenId: authenticatedUserToken.token.id,
        tokenHash: hashUserAccessToken(authToken),
        userId: authenticatedUserToken.token.userId,
        method: req.method,
        path: req.path,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      });
      return next();
    }
  }

  if (!authToken && !serviceToken) {
    return res.status(401).json({ message: "Missing token" });
  }

  return res.status(403).json({ message: "Invalid or expired token" });
}
