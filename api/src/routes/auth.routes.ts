import { Router } from "express";
import { register, login, api } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/api", api);
export default router;
