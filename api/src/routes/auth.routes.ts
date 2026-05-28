import { Router } from "express";
import { logout } from "../controllers/auth.controller";

const router = Router();
router.post("/logout", logout);

export default router;
