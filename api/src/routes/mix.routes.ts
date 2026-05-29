import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";
import { inscrever, minhasInscricoes, confirmarPagamento, listSessoeAdmin, createSessao, updateSessao, deleteSessao } from "../controllers/mix.controller";

const router = new Hono<AppEnv>();

// Webhook — sem JWT, usa x-internal-secret (validado no controller)
router.post("/webhook/confirmar-pagamento", confirmarPagamento);

// Rotas autenticadas
router.use(verifyJWTOrCodexServiceToken);
router.post("/sessoes/:id/inscrever", inscrever);
router.get("/minhas-inscricoes", minhasInscricoes);

// Admin-only: gestão de sessões
router.get("/sessoes", requireRole("admin"), listSessoeAdmin);
router.post("/sessoes", requireRole("admin"), createSessao);
router.patch("/sessoes/:id", requireRole("admin"), updateSessao);
router.delete("/sessoes/:id", requireRole("admin"), deleteSessao);

export default router;
