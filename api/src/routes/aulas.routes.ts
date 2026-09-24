import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import {
  createAvulsa,
  createExcecao,
  createRecorrente,
  deleteAvulsa,
  deleteExcecao,
  deleteRecorrente,
  listAvulsas,
  listEventos,
  listRecorrentes,
  updateAvulsa,
  updateRecorrente,
} from "../controllers/aulas.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/eventos", listEventos);

router.get("/recorrentes", listRecorrentes);
router.post("/recorrentes", createRecorrente);
router.patch("/recorrentes/:id", updateRecorrente);
router.delete("/recorrentes/:id", deleteRecorrente);
router.post("/recorrentes/:id/excecoes", createExcecao);

router.delete("/excecoes/:id", deleteExcecao);

router.get("/avulsas", listAvulsas);
router.post("/avulsas", createAvulsa);
router.patch("/avulsas/:id", updateAvulsa);
router.delete("/avulsas/:id", deleteAvulsa);

export default router;
