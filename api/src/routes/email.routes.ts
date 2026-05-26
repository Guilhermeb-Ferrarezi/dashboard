import { Router } from "express";
import { sendCustomEmail } from "../controllers/email.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.post("/send", sendCustomEmail);

export default router;
