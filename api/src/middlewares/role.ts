import type { Request, Response, NextFunction } from "express";

export function requireRole(role: "user" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ message: "Forbidden: incorrect role" });
    }
    next();
  };
}
