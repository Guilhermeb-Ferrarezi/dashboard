"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowsOutSimple,
  ArrowUp,
  ArrowCounterClockwise,
  ArrowSquareOut,
  CaretDown,
  MagnifyingGlass,
  Play,
  Plus,
  SlidersHorizontal,
  Shield,
  Spinner,
  Square,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodexMarkdown } from "@/components/portal/codex-markdown";
import { CodexConfirmationDialog } from "@/components/portal/codex-confirmation-dialog";
import { clientApi } from "@/lib/api";
import { getCodexWebSocketUrl, formatCodexTimestamp } from "@/lib/codex";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";
import type {
  CodexAgentCapabilities,
  CodexAccountStatus,
  CodexConfirmationRequest,
  CodexThreadDetail,
  CodexThreadSummary,
  CodexTimelineEntry,
} from "@/types/codex";

const SHOW_CODEx_TECHNICAL_DETAILS =
  process.env.NEXT_PUBLIC_CODEX_SHOW_TECHNICAL_DETAILS === "1"
  || process.env.NEXT_PUBLIC_CODEX_SHOW_TECHNICAL_DETAILS === "true";

interface CodexDrawerProps {
  user: SessionUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestOpenSettings: () => void;
}

type CodexSocketEvent =
  | {
      type: "ready";
      workspaceRoot: string;
      executionMode: string;
      capabilities: CodexAgentCapabilities;
    }
  | { type: "deviceLoginStarted"; loginId: string; verificationUrl: string; userCode: string }
  | { type: "deviceLoginCompleted"; loginId: string | null; success: boolean; error: string | null }
  | { type: "deviceLoginCancelled"; loginId: string }
  | { type: "accountUpdated"; account: CodexAccountStatus }
  | { type: "threadCreated"; thread: CodexThreadSummary }
  | { type: "threadLoaded"; thread: CodexThreadSummary; timeline: CodexTimelineEntry[] }
  | { type: "turnStarted"; threadId: string | null; turnId: string | null }
  | { type: "turnCompleted"; threadId: string | null; turnId: string | null; status: string }
  | { type: "turnInterrupted"; threadId: string; turnId: string }
  | { type: "autoApproval"; threadId: string | null; entry: CodexTimelineEntry }
  | { type: "userPromptAccepted"; threadId: string; prompt: string }
  | { type: "assistantDelta"; threadId: string | null; turnId: string | null; itemId: string | null; delta: string }
  | { type: "commandOutputDelta"; threadId: string | null; turnId: string | null; itemId: string | null; delta: string }
  | { type: "filePatchUpdated"; threadId: string | null; turnId: string | null; itemId: string | null; changes: Array<{ path: string; kind: string; diff: string }> }
  | { type: "itemCompleted"; threadId: string | null; entry: CodexTimelineEntry }
  | { type: "confirmationRequested"; requestId: string; prompt: string; riskLevel: "low" | "elevated" | "high"; reasons: string[] }
  | { type: "confirmationResolved"; requestId: string; accepted: boolean }
  | { type: "error"; message: string };

export function isCodexAccessBlocked(account: CodexAccountStatus | null) {
  return Boolean(account?.codexAccessTokenRequired && !account.codexAccessTokenActive);
}

export function canStartCodexDeviceLogin(
  account: CodexAccountStatus | null,
  executionMode: string | null,
) {
  return Boolean(account?.requiresOpenaiAuth && executionMode && executionMode !== "exec");
}

export function canUseCodexChat(
  account: CodexAccountStatus | null,
  executionMode: string | null,
) {
  return Boolean(account?.connected || executionMode === "exec");
}

export function formatCodexErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("usage limit")
    || normalized.includes("rate limit")
    || normalized.includes("quota")
    || normalized.includes("limit reached")
    || normalized.includes("limit exceeded")
    || normalized.includes("too many requests")
  ) {
    return "O limite de uso do Codex foi atingido. Aguarde a renovacao do limite ou conecte outra conta com acesso disponivel.";
  }

  return message;
}

export function summarizeCodexCommand(command: string) {
  const normalized = command.toLowerCase();

  if (normalized.includes("openapi")) {
    return "Validando contrato da API...";
  }

  if (normalized.includes("/codex/tools")) {
    return "Consultando ferramentas disponíveis...";
  }

  if (normalized.includes("/api/") || normalized.includes("/vct/")) {
    return "Executando chamadas de API...";
  }

  if (normalized.includes("rg ") || normalized.includes("grep ") || normalized.includes("find ") || normalized.includes("ls ")) {
    return "Verificando arquivos do projeto...";
  }

  return "Executando verificação técnica...";
}

export function isCodexReasoningEntry(entry: CodexTimelineEntry) {
  return entry.kind === "system" && entry.status === "reasoning";
}

export function formatCodexReasoningLines(text: string) {
  const normalized = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments =
    normalized.length > 1
      ? normalized
      : text
          .replace(/\s+/g, " ")
          .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ýa-zà-öø-ÿ0-9])/u)
          .map((line) => line.trim())
          .filter(Boolean);

  return segments.map((line) => line.replace(/^[\s>*-]+/, "").trim()).filter(Boolean);
}

function upsertThread(list: CodexThreadSummary[], thread: CodexThreadSummary) {
  return [thread, ...list.filter((item) => item.id !== thread.id)].sort(
    (left, right) => right.updatedAt - left.updatedAt,
  );
}

function mergeTimelineEntry(list: CodexTimelineEntry[], entry: CodexTimelineEntry) {
  const existingIndex = list.findIndex((item) => item.id === entry.id);

  if (existingIndex === -1) {
    return [...list, entry];
  }

  const next = [...list];
  next[existingIndex] = entry;
  return next;
}

export function removeOptimisticUserEntries(
  list: CodexTimelineEntry[],
  text: string,
  threadId?: string | null,
) {
  return list.filter((item) => {
    if (item.kind !== "user") {
      return true;
    }

    if (!item.id.startsWith("optimistic-user:")) {
      return true;
    }

    if (item.text !== text) {
      return true;
    }

    if (!threadId || item.id.startsWith("optimistic-user:pending:")) {
      return false;
    }

    return !item.id.startsWith(`optimistic-user:${threadId}:`);
  });
}

export function appendOptimisticUserEntry(
  list: CodexTimelineEntry[],
  threadId: string | null,
  prompt: string,
  turnId: string | null,
): CodexTimelineEntry[] {
  const optimisticThreadId = threadId || "pending";
  const optimisticId = `optimistic-user:${optimisticThreadId}:${prompt}`;
  const existing = list.find((item) => item.id === optimisticId);

  if (existing && existing.kind === "user") {
    return list;
  }

  return [
    ...list,
    {
      id: optimisticId,
      kind: "user",
      text: prompt,
      status: "pending",
      turnId: turnId ?? `pending:${threadId}`,
    } as CodexTimelineEntry,
  ];
}

function ensureAssistantEntry(
  list: CodexTimelineEntry[],
  itemId: string,
  turnId: string,
  delta: string,
) : CodexTimelineEntry[] {
  const existing = list.find((item) => item.id === itemId && item.kind === "assistant");

  if (!existing || existing.kind !== "assistant") {
    return [
      ...list,
      {
        id: itemId,
        kind: "assistant",
        text: delta,
        turnId,
      } as CodexTimelineEntry,
    ];
  }

  return list.map((item) =>
    item.id === itemId && item.kind === "assistant"
      ? { ...item, text: item.text + delta }
      : item,
  );
}

function ensureCommandEntry(
  list: CodexTimelineEntry[],
  itemId: string,
  turnId: string,
  delta: string,
) : CodexTimelineEntry[] {
  const existing = list.find((item) => item.id === itemId && item.kind === "command");

  if (!existing || existing.kind !== "command") {
    return [
      ...list,
      {
        id: itemId,
        kind: "command",
        command: "Executando comando...",
        output: delta,
        status: "inProgress",
        exitCode: null,
        turnId,
      } as CodexTimelineEntry,
    ];
  }

  return list.map((item) =>
    item.id === itemId && item.kind === "command"
      ? { ...item, output: item.output + delta }
      : item,
  );
}

function ensureFileChangeEntry(
  list: CodexTimelineEntry[],
  itemId: string,
  turnId: string,
  changes: Array<{ path: string; kind: string; diff: string }>,
) : CodexTimelineEntry[] {
  const existing = list.find((item) => item.id === itemId && item.kind === "file-change");

  if (!existing || existing.kind !== "file-change") {
    return [
      ...list,
      {
        id: itemId,
        kind: "file-change",
        changes,
        status: "inProgress",
        turnId,
      } as CodexTimelineEntry,
    ];
  }

  return list.map((item) =>
    item.id === itemId && item.kind === "file-change"
      ? { ...item, changes }
      : item,
  );
}

function renderDiffLine(line: string, index: number) {
  const baseClass = "block whitespace-pre-wrap break-words rounded-sm px-2 py-0.5 leading-6";

  if (line.startsWith("+")) {
    return (
      <span key={`${index}:${line}`} className={cn(baseClass, "text-emerald-300", "bg-emerald-500/8")}>
        {line}
      </span>
    );
  }

  if (line.startsWith("-")) {
    return (
      <span key={`${index}:${line}`} className={cn(baseClass, "text-rose-300", "bg-rose-500/8")}>
        {line}
      </span>
    );
  }

  if (line.startsWith("@@")) {
    return (
      <span key={`${index}:${line}`} className={cn(baseClass, "text-sky-300", "bg-sky-500/8")}>
        {line}
      </span>
    );
  }

  if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
    return (
      <span key={`${index}:${line}`} className={cn(baseClass, "text-amber-200")}>
        {line}
      </span>
    );
  }

  return (
    <span key={`${index}:${line}`} className={cn(baseClass, "text-muted-foreground")}>
      {line}
    </span>
  );
}

function renderStructuredDiff(diff: string) {
  return diff
    .split("\n")
    .map((line, index) => renderDiffLine(line, index));
}

export function CodexDrawer({
  user,
  open,
  onOpenChange,
  onRequestOpenSettings,
}: CodexDrawerProps) {
  const [account, setAccount] = useState<CodexAccountStatus | null>(null);
  const [threads, setThreads] = useState<CodexThreadSummary[]>([]);
  const [currentThread, setCurrentThread] = useState<CodexThreadSummary | null>(null);
  const [timeline, setTimeline] = useState<CodexTimelineEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<CodexConfirmationRequest | null>(null);
  const [deviceLogin, setDeviceLogin] = useState<{
    loginId: string;
    verificationUrl: string;
    userCode: string;
  } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const activeTurnIdRef = useRef<string | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const historyMenuRef = useRef<HTMLDivElement | null>(null);
  const historyCloseTimeoutRef = useRef<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyClosing, setHistoryClosing] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [accessRefreshTick, setAccessRefreshTick] = useState(0);
  const [expandedCommandIds, setExpandedCommandIds] = useState<Set<string>>(() => new Set());
  const [hiddenReasoningIds, setHiddenReasoningIds] = useState<Set<string>>(() => new Set());
  const [executionMode, setExecutionMode] = useState<string | null>(null);

  const connected = Boolean(account?.connected);
  const accessBlocked = isCodexAccessBlocked(account);
  const allowDeviceLogin = canStartCodexDeviceLogin(account, executionMode);
  const canChat = canUseCodexChat(account, executionMode);

  function showAsyncError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    toast.error(message);
  }

  function sendConfirmationDecision(requestId: string, accepted: boolean) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Socket do Codex ainda nao esta pronto.");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "confirmPrompt",
        requestId,
        accepted,
      }),
    );
  }

  function openHistoryMenu() {
    if (historyCloseTimeoutRef.current) {
      window.clearTimeout(historyCloseTimeoutRef.current);
      historyCloseTimeoutRef.current = null;
    }

    setHistoryClosing(false);
    setHistoryOpen(true);
  }

  function closeHistoryMenu() {
    if (!historyOpen || historyClosing) {
      return;
    }

    setHistoryClosing(true);
    historyCloseTimeoutRef.current = window.setTimeout(() => {
      setHistoryOpen(false);
      setHistoryClosing(false);
      historyCloseTimeoutRef.current = null;
    }, 150);
  }

  function toggleHistoryMenu() {
    if (historyOpen) {
      closeHistoryMenu();
      return;
    }

    openHistoryMenu();
  }

  function toggleCommandDetails(entryId: string) {
    setExpandedCommandIds((current) => {
      const next = new Set(current);

      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      return next;
    });
  }

  function toggleReasoningDetails(entryId: string) {
    setHiddenReasoningIds((current) => {
      const next = new Set(current);

      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      return next;
    });
  }

  useEffect(() => {
    function handleCodexAccessUpdated() {
      setAccessRefreshTick((current) => current + 1);
    }

    window.addEventListener("codex-access-updated", handleCodexAccessUpdated);

    return () => {
      window.removeEventListener("codex-access-updated", handleCodexAccessUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open || user.role !== "admin" || loading || accessBlocked) {
      return;
    }

    let closed = false;
    const socket = new WebSocket(getCodexWebSocketUrl());
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as CodexSocketEvent;

      switch (payload.type) {
        case "ready":
          setExecutionMode(payload.executionMode);
          break;
        case "deviceLoginStarted":
          setDeviceLogin(payload);
          break;
        case "deviceLoginCompleted":
          setDeviceLogin(null);
          if (payload.success) {
            toast.success("Conta ChatGPT conectada ao Codex.");
            void refreshAccount().catch((error) =>
              showAsyncError(error, "Falha ao atualizar a conta Codex."),
            );
          } else {
            toast.error(payload.error || "Falha ao concluir o device auth.");
          }
          break;
        case "deviceLoginCancelled":
          setDeviceLogin((current) =>
            current?.loginId === payload.loginId ? null : current,
          );
          break;
        case "accountUpdated":
          setAccount(payload.account);
          break;
        case "threadCreated":
          setThreads((current) => upsertThread(current, payload.thread));
          setCurrentThread(payload.thread);
          break;
        case "threadLoaded":
          setCurrentThread(payload.thread);
          setTimeline(payload.timeline);
          setThreads((current) => upsertThread(current, payload.thread));
          break;
        case "turnStarted":
          activeTurnIdRef.current = payload.turnId;
          setActiveTurnId(payload.turnId);
          setSending(true);
          break;
        case "turnCompleted":
          activeTurnIdRef.current = null;
          setActiveTurnId(null);
          setSending(false);
          void refreshThreads().catch((error) =>
            showAsyncError(error, "Falha ao atualizar a lista de conversas."),
          );
          break;
        case "turnInterrupted":
          activeTurnIdRef.current = null;
          setActiveTurnId(null);
          setSending(false);
          break;
        case "autoApproval":
          setTimeline((current) => mergeTimelineEntry(current, payload.entry));
          break;
        case "userPromptAccepted":
          setDraft("");
          break;
        case "assistantDelta": {
          if (!payload.itemId || !payload.turnId) {
            break;
          }
          const assistantItemId = payload.itemId;
          const assistantTurnId = payload.turnId;
          setTimeline((current) =>
            ensureAssistantEntry(current, assistantItemId, assistantTurnId, payload.delta),
          );
          break;
        }
        case "commandOutputDelta": {
          if (!payload.itemId || !payload.turnId) {
            break;
          }
          const commandItemId = payload.itemId;
          const commandTurnId = payload.turnId;
          setTimeline((current) =>
            ensureCommandEntry(current, commandItemId, commandTurnId, payload.delta),
          );
          break;
        }
        case "filePatchUpdated": {
          if (!payload.itemId || !payload.turnId) {
            break;
          }
          const filePatchItemId = payload.itemId;
          const filePatchTurnId = payload.turnId;
          setTimeline((current) =>
            ensureFileChangeEntry(current, filePatchItemId, filePatchTurnId, payload.changes),
          );
          break;
        }
        case "itemCompleted": {
          const itemCompletedEntry = payload.entry as CodexTimelineEntry;
          setTimeline((current) => {
            const next =
              itemCompletedEntry.kind === "user"
                ? removeOptimisticUserEntries(current, itemCompletedEntry.text, payload.threadId)
                : current;
            return mergeTimelineEntry(next, itemCompletedEntry);
          });
          break;
        }
        case "confirmationRequested":
          setPendingConfirmation({
            requestId: payload.requestId,
            prompt: payload.prompt,
            riskLevel: payload.riskLevel,
            reasons: payload.reasons,
          });
          setSending(false);
          break;
        case "confirmationResolved":
          setPendingConfirmation((current) =>
            current?.requestId === payload.requestId ? null : current,
          );
          if (!payload.accepted) {
            toast.info("Ação cancelada.");
          }
          break;
        case "error":
          setSending(false);
          toast.error(formatCodexErrorMessage(payload.message));
          break;
        default:
          break;
      }
    };

    socket.onerror = (event) => {
      console.error("[codex-drawer] websocket error", event);
    };

    socket.onclose = () => {
      if (!closed) {
        socketRef.current = null;
      }
    };

    return () => {
      closed = true;
      socket.close();
      socketRef.current = null;
      setActiveTurnId(null);
      activeTurnIdRef.current = null;
      setDeviceLogin(null);
      setPendingConfirmation(null);
    };
  }, [accessBlocked, accessRefreshTick, loading, open, user.role]);

  useEffect(() => {
    if (!open || user.role !== "admin") {
      return;
    }

    setLoading(true);

    refreshAccount()
      .then((nextAccount) => {
        if (!nextAccount.codexAccessTokenActive) {
          setThreads([]);
          setCurrentThread(null);
          setTimeline([]);
          setActiveTurnId(null);
          setSending(false);
          setDeviceLogin(null);
          setPendingConfirmation(null);
          return null;
        }

        return refreshThreads();
      })
      .catch((error) => {
        showAsyncError(error, "Nao foi possivel carregar o painel do Codex.");
      })
      .finally(() => setLoading(false));
  }, [accessRefreshTick, open, user.role]);

  useEffect(() => {
    timelineRef.current?.scrollTo({
      top: timelineRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [timeline]);

  useEffect(() => {
    if (!historyOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!historyMenuRef.current?.contains(event.target as Node)) {
        closeHistoryMenu();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [historyOpen]);

  useEffect(() => {
    return () => {
      if (historyCloseTimeoutRef.current) {
        window.clearTimeout(historyCloseTimeoutRef.current);
      }
    };
  }, []);

  const filteredThreads = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) {
      return threads;
    }

    return threads.filter((thread) =>
      [thread.title, thread.preview].join(" ").toLowerCase().includes(query),
    );
  }, [historySearch, threads]);

  async function refreshAccount() {
    const response = await clientApi<{ ok: true; account: CodexAccountStatus }>("/codex/account");
    setAccount(response.account);
    return response.account;
  }

  async function refreshThreads() {
    const response = await clientApi<{ ok: true; threads: CodexThreadSummary[] }>("/codex/threads");
    setThreads(response.threads);
    setCurrentThread((current) =>
      current
        ? response.threads.find((thread) => thread.id === current.id) ?? current
        : current,
    );
  }

  async function loadThread(threadId: string) {
    setLoadingThread(true);

    try {
      const response = await clientApi<{ ok: true } & CodexThreadDetail>(`/codex/threads/${threadId}`);
      setCurrentThread(response.thread);
      setTimeline(response.timeline);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel carregar a conversa.",
      );
    } finally {
      setLoadingThread(false);
    }
  }

  async function logout() {
    try {
      await clientApi("/codex/account/logout", { method: "POST" });
      setAccount((current) =>
        current
          ? { ...current, connected: false, email: null, planType: null, sharedAccountLabel: null }
          : current,
      );
      setDeviceLogin(null);
      toast.success("Conta Codex desconectada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel desconectar a conta Codex.",
      );
    }
  }

  function startDeviceLogin() {
    socketRef.current?.send(JSON.stringify({ type: "startDeviceLogin" }));
  }

  function sendPrompt(promptOverride?: string) {
    if (pendingConfirmation) {
      toast.info("Existe uma confirmacao pendente.");
      return;
    }

    const prompt = (promptOverride ?? draft).trim();

    if (!prompt) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Socket do Codex ainda nao esta pronto.");
      return;
    }

    setSending(true);
    setTimeline((current) =>
      appendOptimisticUserEntry(
        current,
        currentThread?.id ?? null,
        prompt,
        activeTurnIdRef.current,
      ),
    );
    setDraft("");
    socketRef.current.send(
      JSON.stringify({
        type: "sendPrompt",
        threadId: currentThread?.id ?? null,
        prompt,
      }),
    );
  }

  function approvePendingConfirmation() {
    if (!pendingConfirmation) {
      return;
    }

    setSending(true);
    sendConfirmationDecision(pendingConfirmation.requestId, true);
  }

  function denyPendingConfirmation() {
    if (!pendingConfirmation) {
      return;
    }

    sendConfirmationDecision(pendingConfirmation.requestId, false);
    setPendingConfirmation(null);
    setSending(false);
  }

  function interruptTurn() {
    if (!currentThread?.id || !activeTurnId) {
      return;
    }

    socketRef.current?.send(
      JSON.stringify({
        type: "interrupt",
        threadId: currentThread.id,
        turnId: activeTurnId,
      }),
    );
  }

  function resetChat() {
    setCurrentThread(null);
    setTimeline([]);
    setActiveTurnId(null);
    setDraft("");
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await drawerRef.current?.requestFullscreen();
    } catch {
      toast.error("Nao foi possivel alternar a tela cheia.");
    }
  }

  if (user.role !== "admin") {
    return null;
  }

  if (accessBlocked) {
    return (
      <div ref={drawerRef} className="flex h-full min-h-0 min-w-0 w-full items-center justify-center overflow-hidden bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-destructive">
                Codex bloqueado
              </p>
              <h2 className="text-lg font-semibold">Crie um token de acesso</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {account?.codexAccessBlockedReason ??
              "O Codex precisa de um token ativo desse admin para liberar as requisicoes no portal."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" className="gap-2" onClick={onRequestOpenSettings}>
              <Shield className="size-4" />
              Abrir configuracoes
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => void refreshAccount()}>
              <ArrowCounterClockwise className="size-4" />
              Atualizar estado
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={drawerRef} className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background">
      <CodexConfirmationDialog
        request={pendingConfirmation}
        open={Boolean(pendingConfirmation)}
        onOpenChange={(next) => {
          if (!next && pendingConfirmation) {
            denyPendingConfirmation();
          }
        }}
        onApprove={approvePendingConfirmation}
        onDeny={denyPendingConfirmation}
      />

      <div className="px-2 py-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div ref={historyMenuRef} className="relative min-w-0 flex-1">
              <button
                type="button"
                onClick={toggleHistoryMenu}
                className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-card/80"
              >
                <span className="truncate">{currentThread?.title || "New conversation"}</span>
                <CaretDown className="size-3.5 shrink-0" />
              </button>

              {historyOpen ? (
                <div
                  className={cn(
                    "absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(320px,calc(100vw-3rem))] origin-top-left rounded-2xl border border-border bg-popover p-2 shadow-[0_14px_40px_rgba(0,0,0,0.38)] duration-150 ease-out",
                    historyClosing
                      ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2"
                      : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
                  )}
                >
                  <div className="relative">
                    <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder="Search..."
                      className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
                    />
                    <MagnifyingGlass className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>

                  <div className="px-1 pb-1 pt-3">
                    <p className="text-xs text-muted-foreground">Older</p>
                  </div>

                  <div className="max-h-52 space-y-1 overflow-y-auto px-1 pb-2">
                    {filteredThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          closeHistoryMenu();
                          void loadThread(thread.id);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1 truncate text-foreground">{thread.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(thread.updatedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </button>
                    ))}
                    {filteredThreads.length === 0 ? (
                      <div className="rounded-xl px-2 py-3 text-sm text-muted-foreground">
                        Nenhuma conversa encontrada.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      closeHistoryMenu();
                      resetChat();
                    }}
                    className="flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    + New conversation
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button type="button" variant="ghost" size="icon-sm" onClick={resetChat}>
                <Plus className="size-4" />
                <span className="sr-only">Novo chat</span>
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={toggleFullscreen}>
                <ArrowsOutSimple className="size-4" />
                <span className="sr-only">Tela cheia</span>
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
                <span className="sr-only">Fechar chat</span>
              </Button>
            </div>
          </div>
      </div>

      {deviceLogin ? (
        <div className="border-b border-border/60 bg-primary/5 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Device auth pendente</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Abra o link abaixo, entre com a conta ChatGPT e informe o codigo.
              </p>
            </div>
            <Badge className="border border-primary/20 bg-primary/10 text-primary">
              {deviceLogin.userCode}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => window.open(deviceLogin.verificationUrl, "_blank", "noopener,noreferrer")}
            >
              <ArrowSquareOut className="size-3.5" />
              Abrir verificacao
            </Button>
            <code className="rounded-md bg-card px-2 py-1 text-xs text-foreground">
              {deviceLogin.verificationUrl}
            </code>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
          <section
            ref={timelineRef}
            className="min-h-0 space-y-2 overflow-y-auto px-3 py-2"
          >
            {!canChat ? (
              <div className="py-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Shield className="size-4 text-primary" />
                  {allowDeviceLogin
                    ? "Conecte a conta compartilhada para liberar o agente."
                    : "O agente nao usa login compartilhado neste modo."}
                </div>
                <p className="mt-2">
                  {allowDeviceLogin
                    ? "O login usa device auth do ChatGPT. Depois disso, qualquer admin pode abrir conversas separadas, mas a conta Codex do servidor continua a mesma."
                    : "O modo exec usa a configuracao local do servidor. Se o Codex continuar desconectado, o ajuste precisa ser feito no runtime do backend, nao por este botao."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowDeviceLogin ? (
                    <Button type="button" size="sm" className="gap-2" onClick={startDeviceLogin}>
                      <Play className="size-3.5" />
                      Conectar ChatGPT
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void refreshThreads()}>
                    <ArrowCounterClockwise className="size-3.5" />
                    Atualizar
                  </Button>
                </div>
              </div>
            ) : null}

            {canChat && loadingThread ? (
              <div className="flex items-center gap-2 px-0.5 py-1 text-sm text-muted-foreground">
                <Spinner className="size-4 animate-spin" />
                Carregando conversa...
              </div>
            ) : null}

            {canChat && !loadingThread && timeline.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Nenhuma mensagem ainda.</p>
                <p className="mt-2">
                  Abra uma conversa da lista ou comece uma nova pedindo uma tarefa para o Codex.
                </p>
              </div>
            ) : null}

            {timeline.map((entry) => {
              if (entry.kind === "user") {
                return (
                  <div key={entry.id} className="ml-auto max-w-[88%] rounded-[16px] bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_90%,white),color-mix(in_oklch,var(--primary)_72%,black))] px-3 py-2 text-sm text-primary-foreground shadow-[0_4px_14px_rgba(98,110,255,0.18)]">
                    <CodexMarkdown tone="inverse" className="text-sm leading-7">
                      {entry.text}
                    </CodexMarkdown>
                  </div>
                );
              }

              if (entry.kind === "assistant") {
                return (
                  <div key={entry.id} className="max-w-[92%] px-0.5 py-0.5 text-sm text-foreground">
                    <CodexMarkdown className="text-sm leading-7">
                      {entry.text}
                    </CodexMarkdown>
                  </div>
                );
              }

              if (isCodexReasoningEntry(entry)) {
                const hidden = hiddenReasoningIds.has(entry.id);
                const reasoningLines = formatCodexReasoningLines(entry.text);

                return (
                  <div key={entry.id} className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        <CaretDown className={cn("size-3 shrink-0 transition-transform", hidden && "-rotate-90")} />
                        <span>thinking</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => toggleReasoningDetails(entry.id)}
                        aria-expanded={!hidden}
                      >
                        {hidden ? "show thinking" : "hide thinking"}
                      </button>
                    </div>
                    {!hidden ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-border/50 bg-background/70 px-2.5 py-2 font-mono text-[11px] leading-5 text-foreground">
                        {reasoningLines.length > 0 ? reasoningLines.map((line, index) => (
                          <div key={`${entry.id}:reasoning:${index}`} className="flex gap-2">
                            <span className="shrink-0 text-muted-foreground">→</span>
                            <span className="min-w-0 break-words">{line}</span>
                          </div>
                        )) : (
                          <div className="flex gap-2">
                            <span className="shrink-0 text-muted-foreground">→</span>
                            <span className="min-w-0 break-words">Pensamento em andamento.</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (entry.kind === "command") {
                if (!SHOW_CODEx_TECHNICAL_DETAILS) {
                  if (entry.status !== "inProgress") {
                    return null;
                  }

                  return (
                    <div key={entry.id} className="flex items-center gap-2 px-0.5 py-1 text-sm text-muted-foreground">
                      <Spinner className="size-4 animate-spin" />
                      <span>{summarizeCodexCommand(entry.command)}</span>
                    </div>
                  );
                }

                const expanded = expandedCommandIds.has(entry.id);

                return (
                  <div key={entry.id} className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 text-left text-xs font-medium uppercase tracking-[0.16em] text-sky-300 transition hover:text-sky-200"
                        onClick={() => toggleCommandDetails(entry.id)}
                        aria-expanded={expanded}
                      >
                        <CaretDown className={cn("size-3 shrink-0 transition-transform", !expanded && "-rotate-90")} />
                        <span className="truncate">Consulta técnica</span>
                      </button>
                      <Badge className="border border-sky-500/20 bg-sky-500/10 text-sky-300">
                        {entry.status}
                      </Badge>
                    </div>
                    {expanded ? (
                      <>
                        <code className="mt-2 block overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-xs leading-6 text-foreground">
                          {entry.command}
                        </code>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border/60 bg-background/70 px-2.5 py-2.5 text-xs leading-6 text-muted-foreground">
                          <code className="block whitespace-pre-wrap break-words">
                            {entry.output || "Sem saida registrada."}
                          </code>
                        </pre>
                      </>
                    ) : null}
                  </div>
                );
              }

              if (entry.kind === "file-change") {
                return (
                  <div key={entry.id} className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300">
                        Alteracoes de arquivo
                      </p>
                      <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {entry.changes.map((change) => (
                        <div key={`${entry.id}:${change.path}`} className="rounded-lg bg-background/70 p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-medium text-foreground">
                              {change.path}
                            </p>
                            <Badge variant="secondary">{change.kind}</Badge>
                          </div>
                          <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border/50 bg-background/70 p-2 text-[11px] leading-5">
                            <code className="block font-mono">
                              {renderStructuredDiff(change.diff)}
                            </code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <CodexMarkdown tone="muted" className="text-sm leading-7">
                    {entry.text}
                  </CodexMarkdown>
                </div>
              );
            })}
          </section>

          <section className="bg-background/90 px-3 py-2 backdrop-blur-xl">
            {activeTurnId ? (
              <div className="mb-1.5 flex justify-end">
                <Badge className="border border-primary/20 bg-primary/10 text-primary">
                  Turno em andamento
                </Badge>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 rounded-[16px] bg-[#1f1f23] px-3 py-2.5">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendPrompt();
                  }
                }}
                placeholder="Como posso ajudar?"
                rows={3}
                className="h-10 max-h-20 w-full resize-none overflow-y-auto border-0 bg-transparent px-0 py-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                disabled={!canChat || sending}
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border/60 bg-background/30 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span className="text-sm">✎</span>
                  Ask
                </button>

                <div className="flex items-center gap-2">
                  {activeTurnId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground"
                      onClick={interruptTurn}
                    >
                      <Square className="size-3.5" />
                      <span className="sr-only">Interromper</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      <span className="sr-only">Ajustes</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="icon-sm"
                    className="rounded-full bg-primary/90 text-primary-foreground"
                    onClick={() => sendPrompt()}
                    disabled={!canChat || sending}
                  >
                    {sending ? <Spinner className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
                    <span className="sr-only">Enviar</span>
                  </Button>
                </div>
              </div>
            </div>

          </section>
      </div>
    </div>
  );
}
