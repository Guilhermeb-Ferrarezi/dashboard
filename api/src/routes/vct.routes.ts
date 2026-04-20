import { Router } from "express";
import {
  atribuirTimesAutomatico,
  atualizarNomeTime,
  atualizarTime,
  criarInscricao,
  limparTime,
  listarInscricoes,
  listarTimes,
  preencherTime,
} from "../controllers/vct.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.post("/inscricao", criarInscricao);
router.get("/inscricoes", verifyJWT, requireRole("admin"), listarInscricoes);
router.patch("/inscricao/:id/time", verifyJWT, requireRole("admin"), atualizarTime);
router.post("/times/auto", verifyJWT, requireRole("admin"), atribuirTimesAutomatico);
router.post("/times/:numero/fill", verifyJWT, requireRole("admin"), preencherTime);
router.post("/times/:numero/clear", verifyJWT, requireRole("admin"), limparTime);
router.get("/times", verifyJWT, requireRole("admin"), listarTimes);
router.put("/time/:numero", verifyJWT, requireRole("admin"), atualizarNomeTime);

export default router;
