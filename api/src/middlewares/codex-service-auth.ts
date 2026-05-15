import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";

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

export function verifyJWTOrCodexServiceToken(req: Request, res: Response, next: NextFunction) {
  const authToken = readAuthToken(req);

  if (authToken) {
    try {
      req.user = jwt.verify(authToken, process.env.JWT_SECRET!) as Request["user"];
      if (req.user?.role === "admin") {
        return next();
      }
    } catch {
      // fall through to service token
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: req.headers.authorization,
    "x-codex-access-token": req.headers["x-codex-access-token"] as string | null | undefined,
  });

  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    req.user = {
      id: "codex-service",
      username: "codex-agent",
      role: "admin",
    };
    return next();
  }

  if (!authToken && !serviceToken) {
    return res.status(401).json({ message: "Missing token" });
  }

  return res.status(403).json({ message: "Invalid or expired token" });
}
