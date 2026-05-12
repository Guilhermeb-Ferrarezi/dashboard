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
} from "../controllers/vct.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.post("/inscricao", criarInscricao);
router.get("/inscricoes", verifyJWT, requireRole("admin"), listarInscricoes);
router.post("/valorant-account/lookup", verifyJWT, requireRole("admin"), buscarContaValorant);
router.put("/inscricao/:id", verifyJWT, requireRole("admin"), atualizarInscricao);
router.patch("/inscricao/:id/status", verifyJWT, requireRole("admin"), atualizarStatusInscricao);
router.delete("/inscricao/:id", verifyJWT, requireRole("admin"), removerInscricao);
router.patch("/inscricao/:id/time", verifyJWT, requireRole("admin"), atualizarTime);
router.post("/inscricoes/status", verifyJWT, requireRole("admin"), atualizarStatusInscricoes);
router.post("/times/auto", verifyJWT, requireRole("admin"), atribuirTimesAutomatico);
router.post("/times/:numero/fill", verifyJWT, requireRole("admin"), preencherTime);
router.post("/times/:numero/clear", verifyJWT, requireRole("admin"), limparTime);
router.get("/times", verifyJWT, requireRole("admin"), listarTimes);
router.put("/time/:numero", verifyJWT, requireRole("admin"), atualizarNomeTime);

export default router;
