import { Router } from "express";

import { exchangeSsoCode, startSso } from "../controllers/sso.controller";
import { verifyJWT } from "../middlewares/jwe";

const router = Router();

router.post("/exchange", exchangeSsoCode);
router.post("/:projectId/start", verifyJWT, startSso);

export default router;
