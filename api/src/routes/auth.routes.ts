import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/register", verifyJWTOrCodexServiceToken, requireRole("admin"), register);

export default router;
