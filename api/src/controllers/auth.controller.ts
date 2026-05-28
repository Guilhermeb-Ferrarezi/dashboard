import type { Request, Response } from "express";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";

export async function logout(_req: Request, res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    // Em dev o cookie foi setado em localhost sem domain — não pode passar
    // COOKIE_DOMAIN ou o clearCookie não acha o cookie certo.
    domain: isProd ? process.env.COOKIE_DOMAIN || undefined : undefined,
    path: "/",
  });
  return res.status(204).send();
}
