import type { NextFunction, Request, Response } from "express";

import {
  authenticateAdminAccessToken,
  type AdminAccessTokenSummary,
} from "../lib/admin-access-token";
import { CODEX_ACCESS_BLOCKED_REASON } from "../lib/codex-access";

function readCodexAccessToken(req: Request) {
  const cookieToken = req.cookies?.codex_access_token;

  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const headerToken = req.headers["x-codex-access-token"];

  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

export function requireCodexAccessToken(req: Request, res: Response, next: NextFunction) {
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokenValue = readCodexAccessToken(req);

  if (!tokenValue) {
    return res.status(403).json({
      message: CODEX_ACCESS_BLOCKED_REASON,
    });
  }

  return authenticateAdminAccessToken(adminId, "codex", tokenValue)
    .then((token: AdminAccessTokenSummary | null) => {
      if (!token) {
        return res.status(403).json({
          message: "Token de acesso do Codex invalido ou revogado.",
        });
      }

      req.codexAccessToken = token;
      next();
      return null;
    })
    .catch((error) => {
      console.error("[codex-access] erro ao autenticar token:", error);
      return res.status(500).json({
        message: "Falha ao validar o token de acesso do Codex.",
      });
    });
}
