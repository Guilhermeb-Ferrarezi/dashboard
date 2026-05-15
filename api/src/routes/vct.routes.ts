import { Router } from "express";
import {
  atribuirTimesAutomatico,
  atualizarInscricao,
  atualizarStatusInscricao,
  atualizarStatusInscricoes,
  atualizarNomeTime,
  atualizarTime,
  buscarContaValorant,
  criarInscricao,
  limparTime,
  listarInscricoes,
  listarTimes,
  preencherTime,
  removerInscricao,
  removerTime,
} from "../controllers/vct.controller";
import {
  atualizarFormacao,
  criarFormacao,
  listarFormacoes,
  removerFormacao,
} from "../controllers/vct-formacoes.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.post("/inscricao", criarInscricao);
router.post("/formacoes", criarFormacao);
router.put("/formacoes/:id", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarFormacao);
router.delete("/formacoes/:id", verifyJWTOrCodexServiceToken, requireRole("admin"), removerFormacao);
router.get("/inscricoes", verifyJWTOrCodexServiceToken, requireRole("admin"), listarInscricoes);
router.get("/formacoes", verifyJWTOrCodexServiceToken, requireRole("admin"), listarFormacoes);
router.post("/valorant-account/lookup", verifyJWTOrCodexServiceToken, requireRole("admin"), buscarContaValorant);
router.put("/inscricao/:id", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarInscricao);
router.patch("/inscricao/:id/status", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarStatusInscricao);
router.delete("/inscricao/:id", verifyJWTOrCodexServiceToken, requireRole("admin"), removerInscricao);
router.patch("/inscricao/:id/time", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarTime);
router.post("/inscricoes/status", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarStatusInscricoes);
router.post("/times/auto", verifyJWTOrCodexServiceToken, requireRole("admin"), atribuirTimesAutomatico);
router.post("/times/:numero/fill", verifyJWTOrCodexServiceToken, requireRole("admin"), preencherTime);
router.post("/times/:numero/clear", verifyJWTOrCodexServiceToken, requireRole("admin"), limparTime);
router.delete("/time/:numero", verifyJWTOrCodexServiceToken, requireRole("admin"), removerTime);
router.get("/times", verifyJWTOrCodexServiceToken, requireRole("admin"), listarTimes);
router.put("/time/:numero", verifyJWTOrCodexServiceToken, requireRole("admin"), atualizarNomeTime);

export default router;
