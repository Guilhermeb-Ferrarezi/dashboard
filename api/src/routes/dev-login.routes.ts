// DEV LOGIN BYPASS — só registra a rota em ambiente non-production.
import { Router } from "express";

import { devLogin } from "../controllers/dev-login.controller";

const router = Router();
router.post("/login", devLogin);

export default router;
