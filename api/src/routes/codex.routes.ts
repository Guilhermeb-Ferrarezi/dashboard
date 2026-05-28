import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import type { CodexWsData } from "../lib/codex";

import {
  getCodexAccount,
  listCodexTools,
  listCodexThreads,
  logoutCodex,
  readCodexThread,
  runCodexTool,
} from "../controllers/codex.controller";
import { requireCodexAccessToken } from "../middlewares/codex-access";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();

router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));
router.use(requireCodexAccessToken);
router.get("/account", getCodexAccount);
router.post("/account/logout", logoutCodex);
router.get("/tools", listCodexTools);
router.post("/tools/:toolId/run", runCodexTool);
router.get("/threads", listCodexThreads);
router.get("/threads/:threadId", readCodexThread);

/**
 * Retorna um handler Hono que faz o upgrade HTTP → WS usando o Bun.serve() nativo.
 * Deve ser montado com auth (verifyJWTOrCodexServiceToken + requireRole("admin"))
 * no server.ts, pois o router já aplica esses middlewares apenas para as rotas /api/codex/*.
 * O upgrade WS é montado diretamente no app principal para evitar conflito com
 * os middlewares requireCodexAccessToken.
 */
export function createCodexWsUpgradeHandler(
  getServer: () => { upgrade: (req: Request, opts?: { data?: unknown }) => boolean },
) {
  return async (c: Context<AppEnv>) => {
    const user = c.get("user");
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const server = getServer();
    const data: CodexWsData = {
      userId: user.id,
      username: user.username,
      email: user.email ?? null,
      role: user.role,
    };

    const upgraded = server.upgrade(c.req.raw, { data });
    if (!upgraded) return c.json({ message: "WebSocket upgrade failed" }, 400);

    // Bun assume controle do socket — não retornar Response
    return undefined as unknown as Response;
  };
}

export default router;
