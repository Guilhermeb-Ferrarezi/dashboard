import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";

type WindowEntry = { count: number; resetAt: number };

function createLimiter(opts: { windowMs: number; max: number; message: string }) {
  const store = new Map<string, WindowEntry>();

  return async (c: Context<AppEnv>, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(ip, entry);
    }

    entry.count++;
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.max - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > opts.max) return c.json({ message: opts.message }, 429);
    await next();
  };
}

export const authLoginLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Muitas tentativas de login. Tente novamente em 1 minuto.",
});

export const authRegisterLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Muitas tentativas de registro. Tente novamente em 1 minuto.",
});

export const ssoExchangeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas tentativas de troca SSO. Tente novamente em 1 minuto.",
});
