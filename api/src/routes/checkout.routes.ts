import { Hono } from "hono";
import type { AppEnv } from "../types/hono";

import {
  createCupom,
  createProduto,
  deleteCupom,
  deleteCliente,
  deleteProduto,
  getComprovante,
  getDashboard,
  getNovosPorMes,
  listClienteAssinaturas,
  listClientePedidos,
  listClientes,
  listCupons,
  listProdutos,
  refundOrder,
  updateCliente,
  updateCupom,
  updateProduto
} from "../controllers/checkout.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/clientes", listClientes);
router.patch("/clientes/:userId", updateCliente);
router.delete("/clientes/:userId", deleteCliente);
router.get("/clientes/:userId/pedidos", listClientePedidos);
router.get("/clientes/:userId/assinaturas", listClienteAssinaturas);
router.get("/pedidos/:id/comprovante", getComprovante);
router.post("/pedidos/:id/refund", refundOrder);
router.get("/novos-por-mes", getNovosPorMes);
router.get("/produtos", listProdutos);
router.post("/produtos", createProduto);
router.put("/produtos/:id", updateProduto);
router.delete("/produtos/:id", deleteProduto);

router.get("/cupons", listCupons);
router.post("/cupons", createCupom);
router.put("/cupons/:id", updateCupom);
router.delete("/cupons/:id", deleteCupom);

export default router;
