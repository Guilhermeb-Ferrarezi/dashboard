import { Router } from "express";

import {
  createLogProject,
  listLogProjects,
  listProjectLogs,
} from "../controllers/logs.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.get("/projects", verifyJWT, requireRole("admin"), listLogProjects);
router.post("/projects", verifyJWT, requireRole("admin"), createLogProject);
router.get("/", verifyJWT, requireRole("admin"), listProjectLogs);

export default router;
