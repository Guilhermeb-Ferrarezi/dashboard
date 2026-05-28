import type { Context } from "hono";
import { deleteCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";

export async function logout(c: Context<AppEnv>): Promise<Response> {
  const isProd = process.env.NODE_ENV === "production";
  deleteCookie(c, AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    // Em dev o cookie foi setado em localhost sem domain — não pode passar
    // COOKIE_DOMAIN ou o clearCookie não acha o cookie certo.
    domain: isProd ? process.env.COOKIE_DOMAIN || undefined : undefined,
    path: "/",
  });
  return c.text("", 204);
}
