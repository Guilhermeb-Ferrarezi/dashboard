import { Router } from "express";

import { listProjects } from "../controllers/projects.controller";

const router = Router();

router.get("/", listProjects);

export default router;
