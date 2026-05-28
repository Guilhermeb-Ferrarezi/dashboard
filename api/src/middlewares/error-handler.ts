import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { AppError } from "../lib/app-error.js";

export function errorHandler(err: Error, c: Context<AppEnv>) {
  if (err instanceof AppError) return c.json({ message: err.message }, err.statusCode);
  console.error("Unhandled error:", err);
  return c.json({ message: "Erro interno do servidor" }, 500);
}
