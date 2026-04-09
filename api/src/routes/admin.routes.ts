import { Router } from "express";

import { createUser, listUsers } from "../controllers/admin.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWT, requireRole("admin"));
router.get("/users", listUsers);
router.post("/users", createUser);

export default router;
