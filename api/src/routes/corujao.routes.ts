import { Router } from "express";

import {
  createContato,
  listContatos,
  marcarContato,
  updateContato
} from "../controllers/corujao.controller";
import {
  createSessao,
  getProximaSessao,
  listSessoes,
  updateSessao
} from "../controllers/corujao-sessoes.controller";
import {
  createVisita,
  deleteVisita,
  listVisitasByContato
} from "../controllers/corujao-visitas.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/contatos", listContatos);
router.post("/contatos", createContato);
router.patch("/contatos/:id", updateContato);
router.post("/contatos/:id/marcar-contato", marcarContato);

router.get("/sessoes", listSessoes);
router.get("/sessoes/proxima", getProximaSessao);
router.post("/sessoes", createSessao);
router.patch("/sessoes/:id", updateSessao);

router.get("/contatos/:id/visitas", listVisitasByContato);
router.post("/visitas", createVisita);
router.delete("/visitas/:id", deleteVisita);

export default router;
