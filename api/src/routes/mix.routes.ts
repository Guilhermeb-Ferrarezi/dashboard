import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { inscrever, minhasInscricoes, confirmarPagamento } from "../controllers/mix.controller";

const router = new Hono<AppEnv>();

// Webhook — sem JWT, usa x-internal-secret (validado no controller)
router.post("/webhook/confirmar-pagamento", confirmarPagamento);

// Rotas autenticadas
router.use(verifyJWTOrCodexServiceToken);
router.post("/sessoes/:id/inscrever", inscrever);
router.get("/minhas-inscricoes", minhasInscricoes);

export default router;
