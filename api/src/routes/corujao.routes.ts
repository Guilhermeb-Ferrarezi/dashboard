import { Router } from "express";
import {
  listCorujaoClientes,
  createCorujaoCliente,
  updateCorujaoCliente,
  deleteCorujaoCliente,
  listCorujaoSessoes,
  createCorujaoSessao,
  updateCorujaoSessao,
  deleteCorujaoSessao,
  getSessaoPresencas,
  upsertPresenca,
  removePresenca,
  getCorujaoStats,
  getClienteHistorico
} from "../controllers/corujao.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();
router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/stats", getCorujaoStats);

router.get("/clientes", listCorujaoClientes);
router.post("/clientes", createCorujaoCliente);
router.put("/clientes/:id", updateCorujaoCliente);
router.delete("/clientes/:id", deleteCorujaoCliente);
router.get("/clientes/:id/historico", getClienteHistorico);

router.get("/sessoes", listCorujaoSessoes);
router.post("/sessoes", createCorujaoSessao);
router.put("/sessoes/:id", updateCorujaoSessao);
router.delete("/sessoes/:id", deleteCorujaoSessao);

router.get("/sessoes/:id/presencas", getSessaoPresencas);
router.patch("/sessoes/:sessaoId/presencas/:clienteId", upsertPresenca);
router.delete("/sessoes/:sessaoId/presencas/:clienteId", removePresenca);

export default router;
