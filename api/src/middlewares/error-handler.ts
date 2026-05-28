import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/app-error.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Erro interno do servidor" });
}
