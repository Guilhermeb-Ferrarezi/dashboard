import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

export function parsePagination(c: Context<AppEnv>, defaultLimit = 20) {
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
