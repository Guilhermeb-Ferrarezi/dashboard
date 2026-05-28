import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import { exchangeSsoCode, startSso } from "../controllers/sso.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { ssoExchangeLimiter } from "../middlewares/rate-limit";

const router = new Hono<AppEnv>();

router.post("/exchange", ssoExchangeLimiter, exchangeSsoCode);
router.post("/:projectId/start", verifyJWTOrCodexServiceToken, startSso);

export default router;
