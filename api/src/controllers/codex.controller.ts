import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import {
  getCodexAccountStatus,
  listCodexThreadsForUser,
  logoutCodexAccount,
  readCodexThreadForUser,
} from "../lib/codex";
import {
  listCodexRuntimeTools,
  runCodexRuntimeTool,
} from "../lib/codex-tool-runtime";
import { resolveCodexAccessState } from "../lib/codex-access";
import type {
  CodexAccountStatus,
  CodexThreadSummary,
} from "../lib/codex";

const DISCONNECTED_CODEX_ACCOUNT: CodexAccountStatus = {
  connected: false,
  authMode: null,
  requiresOpenaiAuth: true,
  planType: null,
  email: null,
  sharedAccountLabel: null,
  codexAccessTokenActive: false,
  codexAccessTokenRequired: false,
  codexAccessBlockedReason: null,
};

export async function resolveCodexAccountStatus(
  fetchAccountStatus: typeof getCodexAccountStatus = getCodexAccountStatus,
) {
  try {
    return await fetchAccountStatus();
  } catch (error) {
    console.warn(
      "[codex-controller] Falha ao carregar o status do Codex. Retornando estado desconectado.",
      error,
    );
    return DISCONNECTED_CODEX_ACCOUNT;
  }
}

export async function resolveCodexAccountStatusForAdmin(
  adminId: string | undefined,
  fetchAccountStatus: typeof getCodexAccountStatus = getCodexAccountStatus,
  fetchAccessState: typeof resolveCodexAccessState = resolveCodexAccessState,
) {
  const accessState = await fetchAccessState(adminId);
  const { activeToken: _activeToken, ...publicAccessState } = accessState;

  if (!accessState.codexAccessTokenActive) {
    return {
      ...DISCONNECTED_CODEX_ACCOUNT,
      ...publicAccessState,
    };
  }

  try {
    const account = await fetchAccountStatus();
    return {
      ...account,
      ...publicAccessState,
    };
  } catch (error) {
    console.warn(
      "[codex-controller] Falha ao carregar o status do Codex. Retornando estado desconectado.",
      error,
    );
    return {
      ...DISCONNECTED_CODEX_ACCOUNT,
      ...publicAccessState,
    };
  }
}

export async function resolveCodexThreadList(
  userId: string,
  fetchThreadList: typeof listCodexThreadsForUser = listCodexThreadsForUser,
): Promise<CodexThreadSummary[]> {
  try {
    return await fetchThreadList(userId);
  } catch (error) {
    console.warn(
      "[codex-controller] Falha ao carregar threads do Codex. Retornando lista vazia.",
      error,
    );
    return [];
  }
}

export async function getCodexAccount(c: Context<AppEnv>): Promise<Response> {
  const account = await resolveCodexAccountStatusForAdmin(c.get("user")?.id);
  return c.json({ ok: true, account });
}

export async function logoutCodex(c: Context<AppEnv>): Promise<Response> {
  const accessState = await resolveCodexAccessState(c.get("user")?.id);

  if (!accessState.codexAccessTokenActive) {
    return c.json({
      ok: false,
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    }, 403);
  }

  await logoutCodexAccount();
  return c.json({ ok: true, message: "Conta Codex desconectada." });
}

export async function listCodexThreads(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get("user")?.id;

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const accessState = await resolveCodexAccessState(userId);

  if (!accessState.codexAccessTokenActive) {
    return c.json({
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    }, 403);
  }

  const threads = await resolveCodexThreadList(userId);
  return c.json({ ok: true, threads });
}

export async function readCodexThread(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get("user")?.id;
  const threadId = c.req.param("threadId");

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const accessState = await resolveCodexAccessState(userId);

  if (!accessState.codexAccessTokenActive) {
    return c.json({
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    }, 403);
  }

  if (!threadId) {
    return c.json({ message: "Thread nao informada." }, 400);
  }

  try {
    const detail = await readCodexThreadForUser(userId, threadId);
    return c.json({ ok: true, ...detail });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel carregar a thread.";

    if (message.includes("nao pertence")) {
      return c.json({ message }, 404);
    }

    return c.json({ message }, 500);
  }
}

export function listCodexTools(c: Context<AppEnv>): Response {
  return c.json({ ok: true, tools: listCodexRuntimeTools() });
}

export async function runCodexTool(c: Context<AppEnv>): Promise<Response> {
  const toolId = c.req.param("toolId");

  if (!toolId) {
    return c.json({ message: "Ferramenta nao informada." }, 400);
  }

  const body = await c.req.json();

  try {
    const result = await runCodexRuntimeTool(toolId, body?.params ?? {}, {
      workspaceRoot: process.cwd().endsWith("/api")
        ? process.cwd().replace(/\/api$/u, "")
        : process.cwd(),
      cookieHeader: c.req.header("cookie"),
      delegatedUserId: c.get("user")?.id ?? null,
      confirmed: Boolean(body?.confirmed),
    });

    return c.json({ ok: true, result });
  } catch (error) {
    return c.json({
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao executar ferramenta.",
    }, 400);
  }
}
