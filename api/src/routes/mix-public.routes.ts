import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { listSessoes } from "../controllers/mix-public.controller";

const router = new Hono<AppEnv>();

router.get("/sessoes", listSessoes);

export default router;
