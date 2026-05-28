import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import { getDashboardSummary } from "../controllers/dashboard.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.get(
  "/summary",
  verifyJWTOrCodexServiceToken,
  requireRole("admin"),
  getDashboardSummary,
);

export default router;
