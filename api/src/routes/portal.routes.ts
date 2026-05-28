import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import {
  listPortalRecents,
  togglePortalRecentPinHandler,
  trackPortalRecentHandler,
} from "../controllers/portal-recents.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken);
router.get("/recents", listPortalRecents);
router.post("/recents/track", trackPortalRecentHandler);
router.post("/recents/pin", togglePortalRecentPinHandler);

export default router;
