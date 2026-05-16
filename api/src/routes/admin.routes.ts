import { Router } from "express";

import { createUser, listUsers } from "../controllers/admin.controller";
import {
  createAdminAccessTokenHandler,
  listAdminAccessTokensHandler,
  revokeAdminAccessTokenHandler,
} from "../controllers/admin-access-token.controller";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = Router();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));
router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/tokens", listAdminAccessTokensHandler);
router.post("/tokens", createAdminAccessTokenHandler);
router.post("/tokens/:tokenId/revoke", revokeAdminAccessTokenHandler);

export default router;
