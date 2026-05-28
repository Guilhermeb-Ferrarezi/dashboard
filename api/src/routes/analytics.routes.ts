import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { getSalesPagesAnalytics, getRealtimeAnalytics } from "../controllers/analytics.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.get("/sales-pages", verifyJWTOrCodexServiceToken, requireRole("admin"), getSalesPagesAnalytics);
router.get("/realtime", verifyJWTOrCodexServiceToken, requireRole("admin"), getRealtimeAnalytics);

export default router;
