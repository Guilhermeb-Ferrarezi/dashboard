import type { Request, Response } from "express";

import {
  getCodexAccountStatus,
  listCodexThreadsForUser,
  logoutCodexAccount,
  readCodexThreadForUser,
} from "../lib/codex";

export async function getCodexAccount(_req: Request, res: Response) {
  const account = await getCodexAccountStatus();
  return res.json({ ok: true, account });
}

export async function logoutCodex(_req: Request, res: Response) {
  await logoutCodexAccount();
  return res.json({ ok: true, message: "Conta Codex desconectada." });
}

export async function listCodexThreads(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const threads = await listCodexThreadsForUser(userId);
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
