import { Router } from "express";

import {
  createProduto,
  deleteCliente,
  deleteProduto,
  getDashboard,
  getNovosPorMes,
  listClienteAssinaturas,
  listClientePedidos,
  listClientes,
  listProdutos,
  updateCliente,
  updateProduto
} from "../controllers/checkout.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/clientes", listClientes);
router.patch("/clientes/:userId", updateCliente);
router.delete("/clientes/:userId", deleteCliente);
router.get("/clientes/:userId/pedidos", listClientePedidos);
router.get("/clientes/:userId/assinaturas", listClienteAssinaturas);
router.get("/novos-por-mes", getNovosPorMes);
router.get("/produtos", listProdutos);
router.post("/produtos", createProduto);
router.put("/produtos/:id", updateProduto);
router.delete("/produtos/:id", deleteProduto);

export default router;
