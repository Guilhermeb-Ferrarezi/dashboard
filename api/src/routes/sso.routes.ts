import { Router } from "express";

import { exchangeSsoCode, startSso } from "../controllers/sso.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";

const router = Router();

router.post("/exchange", exchangeSsoCode);
router.post("/:projectId/start", verifyJWTOrCodexServiceToken, startSso);

export default router;
