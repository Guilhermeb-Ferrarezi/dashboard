import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { sendCustomEmail } from "../controllers/email.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.post("/send", sendCustomEmail);

export default router;
