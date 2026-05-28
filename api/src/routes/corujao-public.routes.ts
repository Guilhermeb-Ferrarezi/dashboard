import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { getVagas, streamVagas, descontarVaga } from "../controllers/corujao-vagas.controller";

const router = new Hono<AppEnv>();

router.get("/vagas", getVagas);
router.get("/vagas/stream", streamVagas);
router.post("/vagas/descontar", descontarVaga);

export default router;
