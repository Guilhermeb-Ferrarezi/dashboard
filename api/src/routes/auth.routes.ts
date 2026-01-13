import { Router } from "express";
import { register, login} from "../controllers/auth.controller";

const router = Router();

router.post("/api/register", register);
router.post("/api/login", login);
export default router;
