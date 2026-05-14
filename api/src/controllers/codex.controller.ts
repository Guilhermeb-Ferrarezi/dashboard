import type { Request, Response } from "express";

import {
  getCodexAccountStatus,
  listCodexThreadsForUser,
  logoutCodexAccount,
  readCodexThreadForUser,
} from "../lib/codex";
import {
  CODEX_ACCESS_BLOCKED_REASON,
  resolveCodexAccessState,
} from "../lib/codex-access";
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
  codexAccessTokenRequired: true,
  codexAccessBlockedReason: CODEX_ACCESS_BLOCKED_REASON,
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

export async function getCodexAccount(_req: Request, res: Response) {
  const account = await resolveCodexAccountStatusForAdmin(_req.user?.id);
  return res.json({ ok: true, account });
}

export async function logoutCodex(_req: Request, res: Response) {
  const accessState = await resolveCodexAccessState(_req.user?.id);

  if (!accessState.codexAccessTokenActive) {
    return res.status(403).json({
      ok: false,
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    });
  }

  await logoutCodexAccount();
  return res.json({ ok: true, message: "Conta Codex desconectada." });
}

export async function listCodexThreads(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const accessState = await resolveCodexAccessState(userId);

  if (!accessState.codexAccessTokenActive) {
    return res.status(403).json({
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    });
  }

  const threads = await resolveCodexThreadList(userId);
  return res.json({ ok: true, threads });
}

export async function readCodexThread(req: Request, res: Response) {
  const userId = req.user?.id;
  const threadId = Array.isArray(req.params.threadId)
    ? req.params.threadId[0]
    : req.params.threadId;

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const accessState = await resolveCodexAccessState(userId);

  if (!accessState.codexAccessTokenActive) {
    return res.status(403).json({
      message: accessState.codexAccessBlockedReason ?? "Codex bloqueado.",
    });
  }

  if (!threadId) {
    return res.status(400).json({ message: "Thread nao informada." });
  }

  try {
    const detail = await readCodexThreadForUser(userId, threadId);
    return res.json({ ok: true, ...detail });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel carregar a thread.";

    if (message.includes("nao pertence")) {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
}
