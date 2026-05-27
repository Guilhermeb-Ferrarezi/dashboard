import { Router } from "express";
import { getSalesPagesAnalytics } from "../controllers/analytics.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.get("/sales-pages", verifyJWTOrCodexServiceToken, requireRole("admin"), getSalesPagesAnalytics);

export default router;
