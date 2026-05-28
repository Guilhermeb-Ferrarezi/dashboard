import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";

const ADMIN_ROLE = 1;

export async function verifyJWT(c: Context<AppEnv>, next: Next) {
  const token = c.req.header("authorization")?.split(" ")[1];
  if (!token) return c.json({ message: "Token missing" }, 401);

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) return c.json({ message: "Invalid token" }, 403);

  c.set("user", {
    id: String(session.userId),
    username: session.login,
    email: session.email,
    role: session.role === ADMIN_ROLE ? "admin" : "user",
    authType: "session",
  });
  await next();
}

export async function basicAuth(c: Context<AppEnv>, next: Next) {
  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Basic ")) return c.json({ message: "Missing Basic Auth" }, 401);

  const b64 = auth.split(" ")[1];
  if (!b64) return c.json({ message: "Usuário ou senha incorreta" }, 401);

  const decoded = Buffer.from(b64, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS) {
    await next();
    return;
  }
  return c.json({ message: "Invalid Basic Auth" }, 403);
}
