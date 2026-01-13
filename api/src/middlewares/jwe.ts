import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });

  const token: any = authHeader.split(" ")[1];
  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
