import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import { listProjects } from "../controllers/projects.controller";

const router = new Hono<AppEnv>();

router.get("/", listProjects);

export default router;
