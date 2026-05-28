import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { logout } from "../controllers/auth.controller";

const router = new Hono<AppEnv>();
router.post("/logout", logout);

export default router;
