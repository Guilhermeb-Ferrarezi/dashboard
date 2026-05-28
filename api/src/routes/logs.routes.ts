import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import {
  createLogProject,
  listLogProjects,
  listProjectLogs,
} from "../controllers/logs.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.get("/projects", verifyJWTOrCodexServiceToken, requireRole("admin"), listLogProjects);
router.post("/projects", verifyJWTOrCodexServiceToken, requireRole("admin"), createLogProject);
router.get("/", verifyJWTOrCodexServiceToken, requireRole("admin"), listProjectLogs);

export default router;
