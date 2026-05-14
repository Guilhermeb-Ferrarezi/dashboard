import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { IncomingMessage } from "node:http";
import type { AddressInfo, Server as HttpServer } from "node:net";
import jwt from "jsonwebtoken";
import WebSocket, { WebSocketServer } from "ws";

import type { AuthUserPayload } from "../types/express";
import { CodexThreadSession } from "../models/CodexThreadSession";
import { resolveCodexAccessState } from "./codex-access";

type JsonRpcId = string | number;

type JsonRpcResponse = {
  id?: JsonRpcId;
  result?: unknown;
  error?: { message?: string } | string;
  method?: string;
  params?: unknown;
};

type CodexThreadStatus =
  | { type: "notLoaded" | "idle" | "systemError" }
  | { type: "active"; activeFlags?: Array<unknown> };

type CodexUserInput = { type: "text"; text: string } | { type: string; [key: string]: unknown };

type CodexThreadItem =
  | { type: "userMessage"; id: string; content: CodexUserInput[] }
  | { type: "agentMessage"; id: string; text: string }
  | { type: "plan"; id: string; text: string }
  | { type: "reasoning"; id: string; summary?: string[]; content?: string[] }
  | {
      type: "commandExecution";
      id: string;
      command: string;
      aggregatedOutput: string | null;
      status: string;
      exitCode: number | null;
    }
  | {
      type: "fileChange";
      id: string;
      changes: CodexFileChange[];
      status: string;
    }
  | {
      type: "dynamicToolCall" | "mcpToolCall" | "webSearch";
      id: string;
      tool?: string;
      server?: string;
      query?: string;
      status?: string;
    }
  | { type: string; id: string; [key: string]: unknown };

type CodexTurn = {
  id: string;
  items: CodexThreadItem[];
  status: string;
  startedAt: number | null;
  completedAt: number | null;
  error?: { message?: string | null } | null;
};

type CodexThread = {
  id: string;
  preview: string;
  name: string | null;
  updatedAt: number;
  createdAt: number;
  status: CodexThreadStatus;
  cwd: string;
  turns: CodexTurn[];
};

type CodexFileChange = {
  path: string;
  kind: string;
  diff: string;
};

export type CodexAccountStatus = {
  connected: boolean;
  authMode: string | null;
  requiresOpenaiAuth: boolean;
  planType: string | null;
  email: string | null;
  sharedAccountLabel: string | null;
  codexAccessTokenActive: boolean;
  codexAccessTokenRequired: boolean;
  codexAccessBlockedReason: string | null;
};

export type CodexThreadSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  createdAt: number;
  status: string;
  lastOpenedAt: string | null;
};

export type CodexTimelineEntry =
  | {
      id: string;
      kind: "user" | "assistant" | "system";
      text: string;
      status?: string | null;
      turnId: string;
    }
  | {
      id: string;
      kind: "command";
      command: string;
      output: string;
      status: string;
      exitCode: number | null;
      turnId: string;
    }
  | {
      id: string;
      kind: "file-change";
      changes: CodexFileChange[];
      status: string;
      turnId: string;
    };

export type CodexThreadDetail = {
  thread: CodexThreadSummary;
  timeline: CodexTimelineEntry[];
};

type CodexSocketIncomingMessage =
  | { type: "startDeviceLogin" }
  | { type: "cancelDeviceLogin"; loginId: string }
  | { type: "loadThread"; threadId: string }
  | { type: "sendPrompt"; threadId?: string | null; prompt: string }
  | { type: "interrupt"; threadId: string; turnId: string };

type AppServerNotificationHandler = (payload: {
  method: string;
  params: Record<string, unknown>;
}) => void;

const CODEX_WS_PATH = "/api/codex/ws";
const CODEX_APP_SERVER_PORT = Number(process.env.CODEX_APP_SERVER_PORT) || 4545;
const CODEX_APP_SERVER_URL =
  process.env.CODEX_APP_SERVER_URL?.trim() || `ws://127.0.0.1:${CODEX_APP_SERVER_PORT}`;
const APP_SERVER_START_TIMEOUT_MS = 20_000;
const CLIENT_SOCKET_OPEN_STATE = 1;

let appServerProcess: ReturnType<typeof spawn> | null = null;
let appServerStartPromise: Promise<void> | null = null;

function createClientWebSocket(url: string) {
  return new WebSocket(url);
}

function resolveWorkspaceRoot() {
  const configured = process.env.CODEX_WORKSPACE_ROOT?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  const cwd = process.cwd();
  return path.basename(cwd) === "api" ? path.resolve(cwd, "..") : cwd;
}

function resolveCodexHome() {
  const configured = process.env.CODEX_HOME?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(resolveWorkspaceRoot(), ".codex-home");
}

export function getCodexWorkspaceRoot() {
  return resolveWorkspaceRoot();
}

function stringifyStatus(status: CodexThreadStatus | null | undefined) {
  return status?.type ?? "unknown";
}

function safeThreadTitle(thread: Pick<CodexThread, "name" | "preview">) {
  const preferred = thread.name?.trim() || thread.preview?.trim() || "Nova conversa";
  return preferred.slice(0, 80);
}

function safeThreadPreview(thread: Pick<CodexThread, "preview">) {
  return (thread.preview?.trim() || "Sem resumo ainda.").slice(0, 160);
}

function summarizeThread(
  thread: CodexThread,
  session?: {
    lastOpenedAt?: Date | null;
    name?: string | null;
  } | null,
): CodexThreadSummary {
  return {
    id: thread.id,
    title: session?.name?.trim() || safeThreadTitle(thread),
    preview: safeThreadPreview(thread),
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
    status: stringifyStatus(thread.status),
    lastOpenedAt: session?.lastOpenedAt?.toISOString() ?? null,
  };
}

function flattenUserMessage(content: CodexUserInput[]) {
  return content
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      return `[${part.type}]`;
    })
    .join("\n")
    .trim();
}

function serializeTimelineItem(turnId: string, item: CodexThreadItem): CodexTimelineEntry | null {
  switch (item.type) {
    case "userMessage": {
      const content = Array.isArray((item as { content?: unknown }).content)
        ? ((item as { content: CodexUserInput[] }).content)
        : [];
      return {
        id: item.id,
        kind: "user",
        text: flattenUserMessage(content),
        turnId,
      };
    }
    case "agentMessage": {
      const text =
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text
          : "";
      return {
        id: item.id,
        kind: "assistant",
        text,
        turnId,
      };
    }
    case "plan": {
      const text =
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text
          : "";
      return {
        id: item.id,
        kind: "system",
        text,
        status: "plan",
        turnId,
      };
    }
    case "reasoning": {
      const summary = Array.isArray((item as { summary?: unknown }).summary)
        ? ((item as { summary: string[] }).summary)
        : [];
      const content = Array.isArray((item as { content?: unknown }).content)
        ? ((item as { content: string[] }).content)
        : [];
      return {
        id: item.id,
        kind: "system",
        text: [...summary, ...content].join("\n").trim(),
        status: "reasoning",
        turnId,
      };
    }
    case "commandExecution": {
      const command =
        typeof (item as { command?: unknown }).command === "string"
          ? (item as { command: string }).command
          : "";
      const output =
        typeof (item as { aggregatedOutput?: unknown }).aggregatedOutput === "string"
          ? (item as { aggregatedOutput: string }).aggregatedOutput
          : "";
      const status =
        typeof (item as { status?: unknown }).status === "string"
          ? (item as { status: string }).status
          : "completed";
      const exitCode =
        typeof (item as { exitCode?: unknown }).exitCode === "number"
          ? (item as { exitCode: number }).exitCode
          : null;
      return {
        id: item.id,
        kind: "command",
        command,
        output,
        status,
        exitCode,
        turnId,
      };
    }
    case "fileChange": {
      const changes = Array.isArray((item as { changes?: unknown }).changes)
        ? ((item as { changes: CodexFileChange[] }).changes)
        : [];
      const status =
        typeof (item as { status?: unknown }).status === "string"
          ? (item as { status: string }).status
          : "completed";
      return {
        id: item.id,
        kind: "file-change",
        changes,
        status,
        turnId,
      };
    }
    case "dynamicToolCall": {
      const tool =
        typeof (item as { tool?: unknown }).tool === "string"
          ? (item as { tool: string }).tool
          : "desconhecida";
      const status =
        typeof (item as { status?: unknown }).status === "string"
          ? (item as { status: string }).status
          : "completed";
      return {
        id: item.id,
        kind: "system",
        text: `Ferramenta dinamica executada: ${tool}.`,
        status,
        turnId,
      };
    }
    case "mcpToolCall": {
      const server =
        typeof (item as { server?: unknown }).server === "string"
          ? (item as { server: string }).server
          : "servidor";
      const tool =
        typeof (item as { tool?: unknown }).tool === "string"
          ? (item as { tool: string }).tool
          : "tool";
      const status =
        typeof (item as { status?: unknown }).status === "string"
          ? (item as { status: string }).status
          : "completed";
      return {
        id: item.id,
        kind: "system",
        text: `Ferramenta MCP executada: ${server} / ${tool}.`,
        status,
        turnId,
      };
    }
    case "webSearch": {
      const query =
        typeof (item as { query?: unknown }).query === "string"
          ? (item as { query: string }).query
          : "consulta";
      return {
        id: item.id,
        kind: "system",
        text: `Busca web: ${query}.`,
        status: "completed",
        turnId,
      };
    }
    default:
      return null;
  }
}

function serializeThreadDetail(thread: CodexThread, session?: { lastOpenedAt?: Date | null; name?: string | null } | null): CodexThreadDetail {
  const timeline: CodexTimelineEntry[] = [];

  for (const turn of thread.turns) {
    for (const item of turn.items) {
      const entry = serializeTimelineItem(turn.id, item);

      if (entry) {
        timeline.push(entry);
      }
    }

    if (turn.status === "failed" && turn.error?.message) {
      timeline.push({
        id: `${turn.id}:error`,
        kind: "system",
        text: turn.error.message,
        status: "failed",
        turnId: turn.id,
      });
    }
  }

  return {
    thread: summarizeThread(thread, session),
    timeline,
  };
}

async function waitForAppServer(url: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createClientWebSocket(url);
        let settled = false;
        const handleError = (error: unknown) => {
          if (settled) {
            return;
          }

          settled = true;
          reject(error);
        };

        socket.once("error", handleError);
        socket.once("open", () => {
          settled = true;
          socket.close();
          resolve();
        });
      });

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error("Codex app-server nao iniciou a tempo.");
}

async function startCodexAppServer() {
  const codexHome = resolveCodexHome();
  await fs.mkdir(codexHome, { recursive: true });

  const env = {
    ...process.env,
    CODEX_HOME: codexHome,
  };

  const child = spawn(
    "codex",
    [
      "app-server",
      "--listen",
      CODEX_APP_SERVER_URL,
      "-c",
      'cli_auth_credentials_store="file"',
      "-c",
      'forced_login_method="chatgpt"',
    ],
    {
      cwd: resolveWorkspaceRoot(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  appServerProcess = child;
  let appServerReady = false;

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString().trim();

    if (text) {
      console.log(`[codex-app-server] ${text}`);
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();

    if (text) {
      console.error(`[codex-app-server] ${text}`);
    }
  });

  const startupFailure = new Promise<void>((_resolve, reject) => {
    child.once("error", (error) => {
      appServerProcess = null;
      reject(
        error instanceof Error
          ? error
          : new Error("Falha ao iniciar o Codex app-server."),
      );
    });

    child.once("exit", (code, signal) => {
      if (appServerReady) {
        return;
      }

      appServerProcess = null;
      reject(
        new Error(
          `Codex app-server encerrou antes de iniciar (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
        ),
      );
    });
  });

  child.once("exit", (code, signal) => {
    console.warn(
      `[codex-app-server] finalizado (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
    );
    appServerProcess = null;
  });

  try {
    await Promise.race([
      waitForAppServer(CODEX_APP_SERVER_URL, APP_SERVER_START_TIMEOUT_MS).then(() => {
        appServerReady = true;
      }),
      startupFailure,
    ]);
  } catch (error) {
    appServerProcess = null;
    throw error;
  }
}

export async function ensureCodexAppServer() {
  if (appServerStartPromise) {
    await appServerStartPromise;
    return;
  }

  if (appServerProcess && !appServerProcess.killed) {
    return;
  }

  if (!appServerStartPromise) {
    appServerStartPromise = startCodexAppServer().finally(() => {
      appServerStartPromise = null;
    });
  }

  await appServerStartPromise;
}

class CodexAppServerClient {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<
    JsonRpcId,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private notificationHandlers = new Set<AppServerNotificationHandler>();

  private handleSocketFailure(error: unknown, rejectConnect?: (error: unknown) => void) {
    if (rejectConnect) {
      rejectConnect(error);
      return;
    }

    for (const pending of this.pending.values()) {
      pending.reject(
        error instanceof Error
          ? error
          : new Error("Falha na conexao com o Codex app-server."),
      );
    }

    this.pending.clear();
    this.socket = null;

    console.error("[codex-app-server] erro no websocket:", error);
  }

  async connect() {
    await ensureCodexAppServer();

    await new Promise<void>((resolve, reject) => {
      const socket = createClientWebSocket(CODEX_APP_SERVER_URL);
      let settled = false;
      const handleError = (error: unknown) => {
        if (!settled) {
          settled = true;
          this.handleSocketFailure(error, reject);
          return;
        }

        this.handleSocketFailure(error);
      };

      socket.on("error", handleError);
      socket.once("open", () => {
        settled = true;
        this.socket = socket;
        resolve();
      });
    });

    this.socket!.on("error", (error) => {
      this.handleSocketFailure(error);
    });
    this.socket!.on("message", (data) => {
      const raw =
        typeof data === "string"
          ? data
          : Buffer.isBuffer(data)
            ? data.toString()
            : Array.isArray(data)
              ? Buffer.concat(data).toString()
              : data.toString();
      this.handleMessage(raw);
    });

    this.socket!.on("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("Conexao com Codex app-server encerrada."));
      }

      this.pending.clear();
      this.socket = null;
    });

    await this.request("initialize", {
      clientInfo: {
        name: "santos-tech-home",
        title: "Santos Tech Home",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });

    this.notify("initialized");
  }

  onNotification(handler: AppServerNotificationHandler) {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  async request<T>(method: string, params?: unknown) {
    if (!this.socket || this.socket.readyState !== CLIENT_SOCKET_OPEN_STATE) {
      throw new Error("Cliente Codex nao conectado.");
    }

    const id = this.nextId++;

    const payload = JSON.stringify({
      id,
      method,
      params,
    });

    const result = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });

    this.socket.send(payload);

    return result;
  }

  notify(method: string, params?: unknown) {
    if (!this.socket || this.socket.readyState !== CLIENT_SOCKET_OPEN_STATE) {
      return;
    }

    this.socket.send(JSON.stringify({ method, params }));
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }

  private respond(id: JsonRpcId, result: unknown) {
    if (!this.socket || this.socket.readyState !== CLIENT_SOCKET_OPEN_STATE) {
      return;
    }

    this.socket.send(JSON.stringify({ id, result }));
  }

  private rejectRequest(id: JsonRpcId, message: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        id,
        error: { message },
      }),
    );
  }

  private async handleServerRequest(message: JsonRpcResponse) {
    const { id, method, params } = message;

    if (id === undefined || !method) {
      return;
    }

    switch (method) {
      case "item/commandExecution/requestApproval":
        this.respond(id, { decision: "accept" });
        return;
      case "item/fileChange/requestApproval":
        this.respond(id, { decision: "accept" });
        return;
      case "item/permissions/requestApproval":
        this.respond(id, {
          permissions: {},
          scope: "session",
          strictAutoReview: false,
        });
        return;
      case "applyPatchApproval":
        this.respond(id, { decision: "approved" });
        return;
      case "execCommandApproval":
        this.respond(id, { decision: "approved" });
        return;
      case "item/tool/requestUserInput":
      case "mcpServer/elicitation/request":
      case "account/chatgptAuthTokens/refresh":
      case "item/tool/call":
        this.rejectRequest(id, `Requisicao do app-server ainda nao suportada: ${method}`);
        return;
      default:
        this.rejectRequest(id, `Metodo do app-server nao suportado: ${method}`);
        return;
    }
  }

  private handleMessage(raw: string) {
    let message: JsonRpcResponse;

    try {
      message = JSON.parse(raw) as JsonRpcResponse;
    } catch {
      return;
    }

    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);

      if (!pending) {
        void this.handleServerRequest(message);
        return;
      }

      this.pending.delete(message.id);

      if (message.error) {
        const reason =
          typeof message.error === "string"
            ? message.error
            : message.error.message || "Falha desconhecida no Codex.";
        pending.reject(new Error(reason));
        return;
      }

      pending.resolve(message.result);
      return;
    }

    if (message.method) {
      for (const handler of this.notificationHandlers) {
        handler({
          method: message.method,
          params: (message.params as Record<string, unknown>) ?? {},
        });
      }
    }
  }
}

async function withCodexClient<T>(callback: (client: CodexAppServerClient) => Promise<T>) {
  const client = new CodexAppServerClient();
  await client.connect();

  try {
    return await callback(client);
  } finally {
    client.close();
  }
}

async function getOwnedThreadSession(userId: string, threadId: string) {
  return CodexThreadSession.findOne({ userId, threadId });
}

async function syncThreadOwnership(userId: string, thread: CodexThread) {
  const title = safeThreadTitle(thread);
  const preview = safeThreadPreview(thread);

  await CodexThreadSession.findOneAndUpdate(
    { threadId: thread.id },
    {
      $set: {
        userId,
        name: title,
        preview,
        status: stringifyStatus(thread.status),
        lastOpenedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}

async function touchThreadOwnership(userId: string, threadId: string) {
  await CodexThreadSession.updateOne(
    { userId, threadId },
    { $set: { lastOpenedAt: new Date() } },
  );
}

export async function getCodexAccountStatus() {
  return withCodexClient<CodexAccountStatus>(async (client) => {
    const [{ account, requiresOpenaiAuth }, auth] = await Promise.all([
      client.request<{
        account: { type: string; email?: string; planType?: string } | null;
        requiresOpenaiAuth: boolean;
      }>("account/read", { refreshToken: false }),
      client.request<{
        authMethod: string | null;
      }>("getAuthStatus", {}),
    ]);

    return {
      connected: Boolean(account),
      authMode: auth.authMethod ?? null,
      requiresOpenaiAuth,
      planType: account?.type === "chatgpt" ? account.planType ?? null : null,
      email: account?.type === "chatgpt" ? account.email ?? null : null,
      sharedAccountLabel:
        account?.type === "chatgpt" && account.email
          ? `Conta compartilhada: ${account.email}`
          : null,
      codexAccessTokenActive: true,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason: null,
    };
  });
}

export async function logoutCodexAccount() {
  return withCodexClient(async (client) => {
    await client.request("account/logout");
    return { ok: true };
  });
}

export async function listCodexThreadsForUser(userId: string) {
  const sessions = await CodexThreadSession.find({ userId })
    .sort({ updatedAt: -1 })
    .lean();

  if (!sessions.length) {
    return [] as CodexThreadSummary[];
  }

  return withCodexClient<CodexThreadSummary[]>(async (client) => {
    const response = await client.request<{
      data: CodexThread[];
    }>("thread/list", {
      limit: 100,
      cwd: [resolveWorkspaceRoot()],
      archived: false,
      useStateDbOnly: false,
    });

    const threadById = new Map(response.data.map((thread) => [thread.id, thread]));

    return sessions
      .map((session) => {
        const thread = threadById.get(session.threadId);

        if (!thread) {
          return null;
        }

        return summarizeThread(thread, session);
      })
      .filter((thread): thread is CodexThreadSummary => Boolean(thread));
  });
}

export async function readCodexThreadForUser(userId: string, threadId: string) {
  const session = await getOwnedThreadSession(userId, threadId);

  if (!session) {
    throw new Error("Thread nao pertence a este admin.");
  }

  return withCodexClient<CodexThreadDetail>(async (client) => {
    const response = await client.request<{ thread: CodexThread }>("thread/read", {
      threadId,
      includeTurns: true,
    });

    await syncThreadOwnership(userId, response.thread);

    return serializeThreadDetail(response.thread, session);
  });
}

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        return [
          part.slice(0, separatorIndex),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function authenticateAdminSocket(request: IncomingMessage) {
  const cookies = parseCookieHeader(request.headers.cookie);
  const token = cookies.auth_token;

  if (!token) {
    throw new Error("Missing token");
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUserPayload;

  if (payload.role !== "admin") {
    throw new Error("Acesso restrito a admins.");
  }

  return payload;
}

function sendBrowserEvent(socket: WebSocket, payload: Record<string, unknown>) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

async function ensureOwnedThread(userId: string, threadId: string) {
  const session = await getOwnedThreadSession(userId, threadId);

  if (!session) {
    throw new Error("Thread nao pertence a este admin.");
  }

  return session;
}

function buildWorkspaceWritePolicy() {
  return {
    type: "workspaceWrite",
    writableRoots: [resolveWorkspaceRoot()],
    networkAccess: true,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false,
  };
}

async function loadThreadForSocket(
  client: CodexAppServerClient,
  userId: string,
  threadId: string,
) {
  const session = await ensureOwnedThread(userId, threadId);
  const response = await client.request<{ thread: CodexThread }>("thread/read", {
    threadId,
    includeTurns: true,
  });

  await syncThreadOwnership(userId, response.thread);

  return serializeThreadDetail(response.thread, session);
}

function createSystemTimelineEntry(
  itemId: string,
  turnId: string,
  text: string,
  status: string,
): CodexTimelineEntry {
  return {
    id: itemId,
    kind: "system",
    text,
    status,
    turnId,
  };
}

export function attachCodexGateway(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("error", (error) => {
    console.error("[codex-gateway] erro no websocket server:", error);
  });

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", (error) => {
      console.error("[codex-gateway] erro no socket de upgrade:", error);
    });

    const host =
      request.headers.host || `127.0.0.1:${(server.address() as AddressInfo | null)?.port ?? 80}`;
    const url = new URL(request.url || "/", `http://${host}`);

    if (url.pathname !== CODEX_WS_PATH) {
      return;
    }

    let user: AuthUserPayload;

    try {
      user = authenticateAdminSocket(request);
    } catch (error) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request, user);
    });
  });

  wss.on("connection", (browserSocket: WebSocket, _request: IncomingMessage, user: AuthUserPayload) => {
    const codexClient = new CodexAppServerClient();
    let currentThreadId: string | null = null;
    let socketClosed = false;

    browserSocket.on("error", (error) => {
      console.error("[codex-browser-socket] erro:", error);
    });

    browserSocket.on("close", () => {
      socketClosed = true;
      codexClient.close();
    });

    void (async () => {
      const accessState = await resolveCodexAccessState(user.id);

      if (!accessState.codexAccessTokenActive) {
        sendBrowserEvent(browserSocket, {
          type: "error",
          message:
            accessState.codexAccessBlockedReason ??
            "Crie um token de acesso do Codex nas configuracoes do admin.",
        });
        browserSocket.close();
        return;
      }

      await codexClient.connect();

      if (socketClosed) {
        codexClient.close();
        return;
      }

      sendBrowserEvent(browserSocket, {
        type: "ready",
        workspaceRoot: resolveWorkspaceRoot(),
        executionMode: "workspace-write",
      });

      codexClient.onNotification(async ({ method, params }) => {
        try {
          switch (method) {
            case "account/login/completed": {
              const success = Boolean(params.success);
              sendBrowserEvent(browserSocket, {
                type: "deviceLoginCompleted",
                loginId: params.loginId ?? null,
                success,
                error: params.error ?? null,
              });
              break;
            }
            case "account/updated": {
              const status = await getCodexAccountStatus();
              const nextAccessState = await resolveCodexAccessState(user.id);
              sendBrowserEvent(browserSocket, {
                type: "accountUpdated",
                account: {
                  ...status,
                  ...nextAccessState,
                },
              });
              break;
            }
            case "thread/started": {
              const thread = params.thread as CodexThread | undefined;

              if (thread) {
                await syncThreadOwnership(user.id, thread);
                currentThreadId = thread.id;
                sendBrowserEvent(browserSocket, {
                  type: "threadCreated",
                  thread: summarizeThread(thread),
                });
              }
              break;
            }
            case "turn/started": {
              const turn = params.turn as CodexTurn | undefined;
              currentThreadId = typeof params.threadId === "string" ? params.threadId : currentThreadId;
              sendBrowserEvent(browserSocket, {
                type: "turnStarted",
                threadId: params.threadId ?? null,
                turnId: turn?.id ?? null,
              });
              break;
            }
            case "turn/completed": {
              const turn = params.turn as CodexTurn | undefined;
              sendBrowserEvent(browserSocket, {
                type: "turnCompleted",
                threadId: params.threadId ?? null,
                turnId: turn?.id ?? null,
                status: turn?.status ?? "completed",
              });
              break;
            }
            case "item/autoApprovalReview/completed": {
              const threadId =
                typeof params.threadId === "string" ? params.threadId : currentThreadId;
              const turnId =
                typeof params.turnId === "string" ? params.turnId : "unknown-turn";
              const status =
                typeof params.status === "string" ? params.status : "completed";

              sendBrowserEvent(browserSocket, {
                type: "autoApproval",
                threadId,
                entry: createSystemTimelineEntry(
                  `auto-approval:${turnId}:${Date.now()}`,
                  turnId,
                  "Autoaprovacao concluida para a etapa atual.",
                  status,
                ),
              });
              break;
            }
            case "serverRequest/resolved": {
              const threadId =
                typeof params.threadId === "string" ? params.threadId : currentThreadId;
              const requestId =
                typeof params.requestId === "string" || typeof params.requestId === "number"
                  ? String(params.requestId)
                  : `request-${Date.now()}`;

              sendBrowserEvent(browserSocket, {
                type: "autoApproval",
                threadId,
                entry: createSystemTimelineEntry(
                  `approval-request:${requestId}`,
                  "approvals",
                  "Aprovacao automatica respondida pelo gateway do Codex.",
                  "completed",
                ),
              });
              break;
            }
            case "item/agentMessage/delta": {
              sendBrowserEvent(browserSocket, {
                type: "assistantDelta",
                threadId: params.threadId ?? currentThreadId,
                turnId: params.turnId ?? null,
                itemId: params.itemId ?? null,
                delta: params.delta ?? "",
              });
              break;
            }
            case "item/commandExecution/outputDelta": {
              sendBrowserEvent(browserSocket, {
                type: "commandOutputDelta",
                threadId: params.threadId ?? currentThreadId,
                turnId: params.turnId ?? null,
                itemId: params.itemId ?? null,
                delta: params.delta ?? "",
              });
              break;
            }
            case "item/fileChange/patchUpdated": {
              sendBrowserEvent(browserSocket, {
                type: "filePatchUpdated",
                threadId: params.threadId ?? currentThreadId,
                turnId: params.turnId ?? null,
                itemId: params.itemId ?? null,
                changes: params.changes ?? [],
              });
              break;
            }
            case "item/completed": {
              const threadId =
                typeof params.threadId === "string" ? params.threadId : currentThreadId;
              const turnId =
                typeof params.turnId === "string" ? params.turnId : "unknown-turn";
              const item = params.item as CodexThreadItem | undefined;

              if (!item) {
                break;
              }

              const entry =
                serializeTimelineItem(turnId, item) ??
                createSystemTimelineEntry(
                  item.id,
                  turnId,
                  `Item concluido: ${item.type}.`,
                  "completed",
                );

              sendBrowserEvent(browserSocket, {
                type: "itemCompleted",
                threadId,
                entry,
              });
              break;
            }
            case "error": {
              sendBrowserEvent(browserSocket, {
                type: "error",
                message:
                  (params.message as string | undefined) ||
                  "Falha na sessao Codex.",
              });
              break;
            }
            case "warning":
            case "guardianWarning": {
              sendBrowserEvent(browserSocket, {
                type: "error",
                message:
                  (params.message as string | undefined) ||
                  "O Codex reportou um aviso durante a execucao.",
              });
              break;
            }
            default:
              break;
          }
        } catch (error) {
          sendBrowserEvent(browserSocket, {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Falha ao processar evento do Codex.",
          });
        }
      });
    })().catch((error) => {
      sendBrowserEvent(browserSocket, {
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar ao Codex.",
      });
      browserSocket.close();
    });

    browserSocket.on("message", async (raw: WebSocket.RawData) => {
      try {
        const payload = JSON.parse(raw.toString()) as CodexSocketIncomingMessage;

        switch (payload.type) {
          case "startDeviceLogin": {
            const response = await codexClient.request<
              | { type: "chatgptDeviceCode"; loginId: string; verificationUrl: string; userCode: string }
              | { type: string }
            >("account/login/start", {
              type: "chatgptDeviceCode",
            });

            if (response.type !== "chatgptDeviceCode") {
              throw new Error("O Codex nao retornou device code.");
            }

            const deviceResponse = response as {
              type: "chatgptDeviceCode";
              loginId: string;
              verificationUrl: string;
              userCode: string;
            };

            sendBrowserEvent(browserSocket, {
              type: "deviceLoginStarted",
              loginId: deviceResponse.loginId,
              verificationUrl: deviceResponse.verificationUrl,
              userCode: deviceResponse.userCode,
            });
            break;
          }
          case "cancelDeviceLogin": {
            await codexClient.request("account/login/cancel", {
              loginId: payload.loginId,
            });
            sendBrowserEvent(browserSocket, {
              type: "deviceLoginCancelled",
              loginId: payload.loginId,
            });
            break;
          }
          case "loadThread": {
            const detail = await loadThreadForSocket(codexClient, user.id, payload.threadId);
            currentThreadId = payload.threadId;
            sendBrowserEvent(browserSocket, {
              type: "threadLoaded",
              thread: detail.thread,
              timeline: detail.timeline,
            });
            break;
          }
          case "sendPrompt": {
            const prompt = payload.prompt.trim();

            if (!prompt) {
              throw new Error("Prompt vazio.");
            }

            let threadId = payload.threadId?.trim() || null;

            if (threadId) {
              await ensureOwnedThread(user.id, threadId);
              await codexClient.request("thread/resume", {
                threadId,
                cwd: resolveWorkspaceRoot(),
                approvalPolicy: "never",
                sandbox: "workspace-write",
              });
            } else {
              const created = await codexClient.request<{ thread: CodexThread }>("thread/start", {
                cwd: resolveWorkspaceRoot(),
                approvalPolicy: "never",
                sandbox: "workspace-write",
              });
              threadId = created.thread.id;
              currentThreadId = threadId;
              await syncThreadOwnership(user.id, created.thread);

              sendBrowserEvent(browserSocket, {
                type: "threadCreated",
                thread: summarizeThread(created.thread),
              });
            }

            await touchThreadOwnership(user.id, threadId);

            sendBrowserEvent(browserSocket, {
              type: "userPromptAccepted",
              threadId,
              prompt,
            });

            await codexClient.request("turn/start", {
              threadId,
              input: [{ type: "text", text: prompt }],
              cwd: resolveWorkspaceRoot(),
              approvalPolicy: "never",
              sandboxPolicy: buildWorkspaceWritePolicy(),
            });
            break;
          }
          case "interrupt": {
            await ensureOwnedThread(user.id, payload.threadId);
            await codexClient.request("turn/interrupt", {
              threadId: payload.threadId,
              turnId: payload.turnId,
            });
            sendBrowserEvent(browserSocket, {
              type: "turnInterrupted",
              threadId: payload.threadId,
              turnId: payload.turnId,
            });
            break;
          }
          default:
            sendBrowserEvent(browserSocket, {
              type: "error",
              message: "Evento desconhecido do drawer Codex.",
            });
        }
      } catch (error) {
        sendBrowserEvent(browserSocket, {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Falha ao processar evento do drawer Codex.",
        });
      }
    });

  });
}
