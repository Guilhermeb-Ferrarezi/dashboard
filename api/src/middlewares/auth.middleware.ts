import type { Request, Response, NextFunction } from "express";

import { verifySessionToken } from "../lib/session-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) {
    return res.status(403).json({ message: "Invalid token" });
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

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    return res.status(401).json({ message: "Missing Basic Auth" });
  }

  const b64 = auth.split(" ")[1];
  if (!b64) {
    return res.status(401).json({ message: "Usuário ou senha incorreta" });
  }

  const decoded = Buffer.from(b64, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS) {
    return next();
  }

  return res.status(403).json({ message: "Invalid Basic Auth" });
}
