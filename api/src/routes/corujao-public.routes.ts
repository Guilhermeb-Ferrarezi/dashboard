import { Router } from "express";
import { getVagas, streamVagas, descontarVaga } from "../controllers/corujao-vagas.controller";

const router = Router();

router.get("/vagas", getVagas);
router.get("/vagas/stream", streamVagas);
router.post("/vagas/descontar", descontarVaga);

export default router;
