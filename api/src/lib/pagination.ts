import type { Request } from "express";

export function parsePagination(req: Request, defaultLimit = 20) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
