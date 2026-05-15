import type { NextFunction, Request, Response } from "express";

import { resolveCodexServiceToken } from "../lib/codex-service-token";

export function requireCodexAccessToken(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Missing token" });
  }

  if (!resolveCodexServiceToken()) {
    return res.status(503).json({
      message: "Codex sem credencial delegada ativa no servidor.",
    });
  }

  next();
}
