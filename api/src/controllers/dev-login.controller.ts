// DEV LOGIN BYPASS — só funciona quando NODE_ENV !== "production".
// Criado em 2026-05-28 pra desbloquear desenvolvimento local após a migração
// do auth pra serviço externo (auth.santos-games.com). Remover quando o
// auth externo suportar localhost como client.
import crypto from "crypto";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { User } from "../models/User";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;
const USER_ROLE = 0;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = b64url(crypto.createHmac("sha256", secret).update(unsigned).digest());
  return `${unsigned}.${signature}`;
}

export async function devLogin(c: Context<AppEnv>): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return c.json({ message: "Not found" }, 404);
  }

  const body = await c.req.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (!username) {
    return c.json({ message: "username obrigatório" }, 400);
  }

  const user = await User.findOne({ username });
  if (!user) {
    return c.json({ message: `Usuário "${username}" não encontrado no Mongo.` }, 404);
  }
  if (!user.authUserId) {
    return c.json({ message: `Usuário "${username}" não tem authUserId. Faça login em produção primeiro pra migrar.` }, 400);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json({ message: "JWT_SECRET não configurado" }, 500);
  }

  const payload = {
    userId: user.authUserId,
    email: user.email ?? "",
    login: user.username,
    role: user.role === "admin" ? ADMIN_ROLE : USER_ROLE,
    sessionId: `dev-${Date.now()}`,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };

  const token = signJwt(payload, secret);

  // Em dev local o frontend roda em :3001 e a API em :4000. Cookies não cruzam
  // portas, então o backend NÃO seta o cookie aqui — retorna o token pra o
  // browser setar via document.cookie no domínio :3001 (que é onde o SSR do
  // Next.js consegue ler depois).
  return c.json({
    ok: true,
    token,
    cookieName: AUTH_COOKIE_NAME,
    maxAgeSeconds: 7 * 24 * 60 * 60,
    user: {
      id: String(user.authUserId),
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
}
