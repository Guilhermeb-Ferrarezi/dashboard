import { Router } from "express";

import { getDashboardSummary } from "../controllers/dashboard.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.get(
  "/summary",
  verifyJWTOrCodexServiceToken,
  requireRole("admin"),
  getDashboardSummary,
);

export default router;
