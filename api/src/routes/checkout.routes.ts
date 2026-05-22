import { Router } from "express";

import {
  createProduto,
  deleteProduto,
  getDashboard,
  getNovosPorMes,
  listClientePedidos,
  listClientes,
  listProdutos,
  updateProduto
} from "../controllers/checkout.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/clientes", listClientes);
router.get("/clientes/:userId/pedidos", listClientePedidos);
router.get("/novos-por-mes", getNovosPorMes);
router.get("/produtos", listProdutos);
router.post("/produtos", createProduto);
router.put("/produtos/:id", updateProduto);
router.delete("/produtos/:id", deleteProduto);

export default router;
