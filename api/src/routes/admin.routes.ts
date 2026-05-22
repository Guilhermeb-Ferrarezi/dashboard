import { Router } from "express";

import { createUser, listUsers } from "../controllers/admin.controller";
import { uploadAdminR2Image } from "../controllers/admin-r2.controller";
import {
  deleteAdminSiteHandler,
  listAdminPublishedSitesHandler,
  publishAdminSiteHandler,
} from "../controllers/admin-site-publisher.controller";
import {
  createAdminAccessTokenHandler,
  getAdminTokenUsageHandler,
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
router.get("/tokens/:tokenId/usage", getAdminTokenUsageHandler);
router.post("/r2/images", uploadAdminR2Image);
router.get("/publicador/sites", listAdminPublishedSitesHandler);
router.post("/publicador/sites", publishAdminSiteHandler);
router.delete("/publicador/sites", deleteAdminSiteHandler);

export default router;
