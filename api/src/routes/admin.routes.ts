import { Router } from "express";

import { createUser, listUsers } from "../controllers/admin.controller";
import {
  createAdminAccessTokenHandler,
  listAdminAccessTokensHandler,
  revokeAdminAccessTokenHandler,
} from "../controllers/admin-access-token.controller";
import { verifyJWT } from "../middlewares/jwe";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWT, requireRole("admin"));
router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/tokens", listAdminAccessTokensHandler);
router.post("/tokens", createAdminAccessTokenHandler);
router.post("/tokens/:tokenId/revoke", revokeAdminAccessTokenHandler);

export default router;
