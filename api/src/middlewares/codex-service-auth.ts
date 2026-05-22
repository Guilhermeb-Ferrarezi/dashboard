import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";
import { authenticateUserAccessToken, hashUserAccessToken, logUserTokenUsage } from "../lib/user-access-token";
import { User } from "../models/User";

function readAuthToken(req: Request) {
  const cookieToken = req.cookies?.auth_token;
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
    try {
      req.user = jwt.verify(authToken, process.env.JWT_SECRET!) as Request["user"];
      return next();
    } catch {
      // fall through to service token
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
      };
      return next();
    }

    try {
      const user = await User.findById(delegatedUserId)
        .select("_id username email role")
        .lean();

      if (!user) {
        return res.status(403).json({ message: "Invalid delegated user" });
      }

      req.user = {
        id: String(user._id),
        username: user.username,
        email: user.email ?? null,
        role: user.role,
      };
      return next();
    } catch {
      return res.status(403).json({ message: "Invalid delegated user" });
    }
  }

  if (authToken) {
    const authenticatedUserToken = await authenticateUserAccessToken(authToken);

    if (authenticatedUserToken) {
      req.user = authenticatedUserToken.user;
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
