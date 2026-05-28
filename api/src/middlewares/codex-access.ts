import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { resolveCodexServiceToken } from "../lib/codex-service-token";

export async function requireCodexAccessToken(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")?.id) return c.json({ message: "Missing token" }, 401);
  if (!resolveCodexServiceToken()) {
    return c.json({ message: "Codex sem credencial delegada ativa no servidor." }, 503);
  }
  await next();
}
