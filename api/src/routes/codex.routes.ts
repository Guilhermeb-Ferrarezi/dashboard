import { Router } from "express";

import {
  getCodexAccount,
  listCodexThreads,
  logoutCodex,
  readCodexThread,
} from "../controllers/codex.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWT, requireRole("admin"));
router.get("/account", getCodexAccount);
router.post("/account/logout", logoutCodex);
router.get("/threads", listCodexThreads);
router.get("/threads/:threadId", readCodexThread);

export default router;
