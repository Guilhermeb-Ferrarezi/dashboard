import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";

export function requireRole(role: "user" | "admin") {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user || user.role !== role) return c.json({ message: "Forbidden: incorrect role" }, 403);
    await next();
  };
}
