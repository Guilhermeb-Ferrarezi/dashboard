import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { hasTokenPermission, type TokenScope } from "../lib/token-permissions.js";

/**
 * Middleware que exige um escopo (TokenScope) para continuar.
 *
 * - Usuários autenticados via JWT/session (sem `tokenPermissions`) passam direto
 *   pois possuem acesso completo.
 * - Tokens de API têm suas permissões verificadas via `hasTokenPermission()`.
 */
export function requirePermission(scope: TokenScope) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user) return c.json({ message: "Não autenticado" }, 401);
    if (user.authType === "session" || user.authType === "service") {
      await next();
      return;
    }
    const perms = user.tokenPermissions ?? [];
    if (!hasTokenPermission(perms, scope)) {
      return c.json({ message: "Permissão insuficiente para esta operação" }, 403);
    }
    await next();
  };
}
