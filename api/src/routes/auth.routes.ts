import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/register", verifyJWT, requireRole("admin"), register);

export default router;
