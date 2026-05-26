import { Router } from "express";

import {
  createContato,
  listContatos,
  marcarContato,
  updateContato
} from "../controllers/corujao.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/contatos", listContatos);
router.post("/contatos", createContato);
router.patch("/contatos/:id", updateContato);
router.post("/contatos/:id/marcar-contato", marcarContato);

export default router;
