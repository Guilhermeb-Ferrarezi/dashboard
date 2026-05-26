import { Router } from "express";

import {
  createContato,
  deleteContato,
  listContatos,
  marcarContato,
  updateContato
} from "../controllers/corujao.controller";
import {
  createSessao,
  deleteSessao,
  getProximaSessao,
  listSessoes,
  updateSessao
} from "../controllers/corujao-sessoes.controller";
import {
  createVisita,
  deleteVisita,
  listVisitasByContato,
  listVisitasBySessao,
  updateVisita
} from "../controllers/corujao-visitas.controller";
import {
  createColaborador,
  listColaboradores,
  updateColaborador
} from "../controllers/corujao-colaboradores.controller";
import { getPainel } from "../controllers/corujao-painel.controller";
import { ajustarVagas } from "../controllers/corujao-vagas.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/contatos", listContatos);
router.post("/contatos", createContato);
router.patch("/contatos/:id", updateContato);
router.post("/contatos/:id/marcar-contato", marcarContato);
router.delete("/contatos/:id", deleteContato);

router.get("/sessoes", listSessoes);
router.get("/sessoes/proxima", getProximaSessao);
router.post("/sessoes", createSessao);
router.patch("/sessoes/:id", updateSessao);
router.delete("/sessoes/:id", deleteSessao);

router.get("/sessoes/:id/visitas", listVisitasBySessao);
router.get("/contatos/:id/visitas", listVisitasByContato);
router.post("/visitas", createVisita);
router.patch("/visitas/:id", updateVisita);
router.delete("/visitas/:id", deleteVisita);

router.get("/colaboradores", listColaboradores);
router.post("/colaboradores", createColaborador);
router.patch("/colaboradores/:id", updateColaborador);

router.get("/painel", getPainel);

router.post("/vagas/ajustar", ajustarVagas);

export default router;
