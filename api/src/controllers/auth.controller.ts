import type { Request, Response } from "express";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";

export async function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
  });
  return res.status(204).send();
}
