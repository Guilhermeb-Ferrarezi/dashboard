// DEV LOGIN BYPASS — só registra a rota em ambiente non-production.
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import { devLogin } from "../controllers/dev-login.controller";

const router = new Hono<AppEnv>();
router.post("/login", devLogin);

export default router;
