import type { Request, Response, NextFunction } from "express";

import { verifySessionToken } from "../lib/session-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }

  if (!token) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  req.user = {
    id: String(session.userId),
    username: session.login,
    email: session.email,
    role: session.role === ADMIN_ROLE ? "admin" : "user",
    authType: "session",
  };
  next();
}
