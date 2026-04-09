import { Router } from "express";

import { exchangeSsoTicket, startSso } from "../controllers/sso.controller";
import { verifyJWT } from "../middlewares/jwe";

const router = Router();

router.post("/exchange", exchangeSsoTicket);
router.post("/:projectId/start", verifyJWT, startSso);

export default router;
