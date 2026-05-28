import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function verifyJWT(c: Context<AppEnv>, next: Next) {
  let token: string | undefined = getCookie(c, AUTH_COOKIE_NAME);

  if (!token) {
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
  }

  if (!token) return c.json({ message: "Missing token" }, 401);

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) return c.json({ message: "Invalid or expired token" }, 403);

  c.set("user", {
    id: String(session.userId),
    username: session.login,
    email: session.email,
    role: session.role === ADMIN_ROLE ? "admin" : "user",
    authType: "session",
  });
  await next();
}
