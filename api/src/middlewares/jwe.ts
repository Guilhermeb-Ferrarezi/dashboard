import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  // Tenta obter token do cookie primeiro, depois do header Authorization
  let token: string | undefined;

  // 1. Verifica se há cookie auth_token
  if (req.cookies?.auth_token) {
    token = req.cookies.auth_token;
  }

  // 2. Se não houver cookie, verifica o header Authorization
  if (!token) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // Se não encontrou token em nenhum lugar
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
