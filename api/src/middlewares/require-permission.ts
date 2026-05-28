import type { Request, Response, NextFunction } from "express";

import { hasTokenPermission, type TokenScope } from "../lib/token-permissions.js";

/**
 * Middleware que exige um escopo (TokenScope) para continuar.
 *
 * - Usuários autenticados via JWT/session (sem `tokenPermissions`) passam direto
 *   pois possuem acesso completo.
 * - Tokens de API têm suas permissões verificadas via `hasTokenPermission()`.
 */
export function requirePermission(scope: TokenScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (user.authType === "session" || user.authType === "service") {
      return next();
    }

    const perms = user.tokenPermissions ?? [];
    if (!hasTokenPermission(perms, scope)) {
      return res.status(403).json({ message: "Permissão insuficiente para esta operação" });
    }

    next();
  };
}
