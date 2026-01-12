import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
}

// Optional Basic Auth middleware
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    return res.status(401).json({ message: "Missing Basic Auth" });
  }

  const b64 = auth.split(" ")[1];
  if (!b64) {
    return res.status(401).json({ message: "Invalid Basic Auth format" });
  }

  const decoded = Buffer.from(b64, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS) {
    return next();
  }

  return res.status(403).json({ message: "Invalid Basic Auth" });
}

