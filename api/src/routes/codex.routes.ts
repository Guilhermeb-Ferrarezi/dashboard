import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import {
  getCodexAccount,
  listCodexTools,
  listCodexThreads,
  logoutCodex,
  readCodexThread,
  runCodexTool,
} from "../controllers/codex.controller";
import { requireCodexAccessToken } from "../middlewares/codex-access";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));
router.use(requireCodexAccessToken);
router.get("/account", getCodexAccount);
router.post("/account/logout", logoutCodex);
router.get("/tools", listCodexTools);
router.post("/tools/:toolId/run", runCodexTool);
router.get("/threads", listCodexThreads);
router.get("/threads/:threadId", readCodexThread);

export default router;
