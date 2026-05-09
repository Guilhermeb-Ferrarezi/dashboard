import { Router } from "express";

import {
  createLogProject,
  listLogProjects,
  listProjectLogs,
} from "../controllers/logs.controller";
import { verifyJWT } from "../middlewares/jwe";

const router = Router();

router.get("/projects", verifyJWT, listLogProjects);
router.post("/projects", verifyJWT, createLogProject);
router.get("/", verifyJWT, listProjectLogs);

export default router;
