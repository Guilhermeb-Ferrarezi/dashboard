import fs from "node:fs/promises";
import path from "node:path";

import { resolveCodexServiceToken } from "./codex-service-token";

export type CodexToolSchemaProperty = {
  type: "string" | "number" | "boolean" | "object";
  description: string;
  enum?: string[];
};

export type CodexRuntimeTool = {
  id: string;
  label: string;
  description: string;
  kind: "read" | "write" | "diagnostic" | "presentation";
  requiresConfirmation: boolean;
  parameters: {
    type: "object";
    required: string[];
    properties: Record<string, CodexToolSchemaProperty>;
  };
};

export type CodexToolRunContext = {
  workspaceRoot: string;
  cookieHeader?: string;
  confirmed?: boolean;
};

export type CodexToolRunResult = {
  ok: boolean;
  toolId: string;
  requiresConfirmation: boolean;
  summary: string;
  data?: unknown;
  error?: CodexNormalizedApiError;
};

export type CodexNormalizedApiError = {
  status: number;
  kind: "auth" | "permission" | "rate_limit" | "not_found" | "validation" | "server" | "unknown";
  message: string;
  nextStep: string;
};

type CodexOperationRiskLevel = "low" | "elevated" | "high";

type DocumentedOpenApiOperation = {
  template: string;
  method: string;
  riskLevel: CodexOperationRiskLevel;
  reasons: string[];
};

const TOOL_DEFINITIONS: CodexRuntimeTool[] = [
  {
    id: "search_openapi_spec",
    label: "Buscar OpenAPI",
    description: "Procura endpoints, métodos e schemas no OpenAPI local antes de chamadas HTTP.",
    kind: "read",
    requiresConfirmation: false,
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Texto a procurar na especificação." },
        maxResults: { type: "number", description: "Quantidade máxima de trechos retornados." },
      },
    },
  },
  {
    id: "search_project_docs",
    label: "Buscar documentação local",
    description: "Procura no README e em docs locais do projeto.",
    kind: "read",
    requiresConfirmation: false,
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Texto a procurar na documentação." },
        maxResults: { type: "number", description: "Quantidade máxima de trechos retornados." },
      },
    },
  },
  {
    id: "execute_internal_api",
    label: "Executar API interna",
    description: "Executa uma chamada HTTP na API interna do Home com validação de método, risco OpenAPI e erro normalizado.",
    kind: "write",
    requiresConfirmation: false,
    parameters: {
      type: "object",
      required: ["method", "path"],
      properties: {
        method: {
          type: "string",
          description: "Método HTTP.",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        },
        path: { type: "string", description: "Path interno iniciado por /, sem host." },
        body: { type: "object", description: "Payload JSON opcional." },
      },
    },
  },
  {
    id: "search_dashboard_pages",
    label: "Buscar páginas do painel",
    description: "Retorna rotas internas conhecidas do portal para direcionar o admin ao lugar certo.",
    kind: "read",
    requiresConfirmation: false,
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Texto da tela ou configuração procurada." },
        maxResults: { type: "number", description: "Quantidade máxima de páginas retornadas." },
      },
    },
  },
  {
    id: "normalize_api_error",
    label: "Normalizar erro de API",
    description: "Classifica erros HTTP e sugere o próximo passo operacional.",
    kind: "diagnostic",
    requiresConfirmation: false,
    parameters: {
      type: "object",
      required: ["status"],
      properties: {
        status: { type: "number", description: "Status HTTP." },
        message: { type: "string", description: "Mensagem original do erro." },
      },
    },
  },
];

const DASHBOARD_PAGES = [
  { title: "Home", path: "/home", keywords: ["home", "inicio", "portal"] },
  { title: "Logs", path: "/logs", keywords: ["logs", "erros", "diagnostico"] },
  { title: "Admin", path: "/admin", keywords: ["admin", "painel", "usuarios"] },
  { title: "Tokens Codex", path: "/admin/users", keywords: ["token", "codex", "acesso"] },
  { title: "VCT Inscrições", path: "/admin/vct-inscricoes", keywords: ["vct", "inscricoes", "times"] },
  { title: "VCT Formações", path: "/vct/formacoes", keywords: ["formacoes", "roster", "times"] },
];

export function listCodexRuntimeTools() {
  return TOOL_DEFINITIONS;
}

export function getCodexRuntimeTool(toolId: string) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === toolId) ?? null;
}

export function normalizeApiError(status: number, message = "Request failed."): CodexNormalizedApiError {
  if (status === 401) {
    return { status, kind: "auth", message, nextStep: "Peça para o usuário relogar e repetir a ação." };
  }

  if (status === 403) {
    return { status, kind: "permission", message, nextStep: "Informe que a conta não tem permissão para essa ação." };
  }

  if (status === 404) {
    return { status, kind: "not_found", message, nextStep: "Verifique se o recurso, nome ou path está correto." };
  }

  if (status === 429) {
    return { status, kind: "rate_limit", message, nextStep: "Informe rate limit e tente novamente depois." };
  }

  if (status === 400) {
    return { status, kind: "validation", message, nextStep: "Aponte o campo inválido e corrija o payload antes de tentar novamente." };
  }

  if (status >= 500) {
    return { status, kind: "server", message, nextStep: "Informe falha do servidor e valide incidentes ou logs." };
  }

  return { status, kind: "unknown", message, nextStep: "Informe o erro retornado e peça mais contexto se necessário." };
}

function validateToolParams(tool: CodexRuntimeTool, params: unknown) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error("Parâmetros devem ser um objeto JSON.");
  }

  const record = params as Record<string, unknown>;

  for (const required of tool.parameters.required) {
    if (record[required] === undefined || record[required] === null || record[required] === "") {
      throw new Error(`Parâmetro obrigatório ausente: ${required}.`);
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const property = tool.parameters.properties[key];

    if (!property) {
      throw new Error(`Parâmetro não suportado: ${key}.`);
    }

    if (property.type === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Parâmetro ${key} deve ser objeto.`);
      }
      continue;
    }

    if (typeof value !== property.type) {
      throw new Error(`Parâmetro ${key} deve ser ${property.type}.`);
    }

    if (property.enum && typeof value === "string" && !property.enum.includes(value)) {
      throw new Error(`Parâmetro ${key} deve ser um de: ${property.enum.join(", ")}.`);
    }
  }

  return record;
}

function normalizeQuery(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function readMaxResults(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(20, Math.floor(value)))
    : 5;
}

function normalizeOpenApiPath(value: string) {
  const pathname = value.split("?")[0] ?? "";
  const normalized = pathname.replace(/\/+$/u, "");
  return normalized || "/";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openApiTemplateMatchesPath(template: string, pathname: string) {
  const pattern = `^${template
    .split("/")
    .map((segment) => (
      /^\{[^/{}]+\}$/u.test(segment)
        ? "[^/]+"
        : escapeRegex(segment)
    ))
    .join("/")}$`;

  return new RegExp(pattern, "u").test(pathname);
}

function getDefaultRiskForMethod(method: string): CodexOperationRiskLevel {
  if (method === "GET") {
    return "low";
  }

  if (method === "DELETE") {
    return "high";
  }

  return "elevated";
}

function normalizeRiskLevel(value: string | undefined, method: string): CodexOperationRiskLevel {
  if (value === "low" || value === "elevated" || value === "high") {
    return value;
  }

  return getDefaultRiskForMethod(method);
}

function readRiskReasons(methodBlock: string) {
  const reasonsBlock = methodBlock.match(/^\s{6}x-codex-risk-reasons:\s*\n((?:\s{8,}-\s*.+\n?)*)/mu)?.[1] ?? "";
  return Array.from(reasonsBlock.matchAll(/^\s{8,}-\s*(.+?)\s*$/gmu))
    .map((reasonMatch) => reasonMatch[1])
    .filter((reason): reason is string => Boolean(reason));
}

async function readDocumentedOpenApiOperations(workspaceRoot: string) {
  const file = path.join(workspaceRoot, "api", "codex", "openapi.yaml");
  const content = await fs.readFile(file, "utf8").catch(() => "");
  const operations: DocumentedOpenApiOperation[] = [];
  const section = content.match(/(^|\n)paths:\n([\s\S]*?)(\n[a-zA-Z][^:\n]*:|\s*$)/u)?.[2] ?? "";
  const pathMatches = Array.from(section.matchAll(/^\s{2}(\/[^\s:]*):\s*$/gmu));

  for (let index = 0; index < pathMatches.length; index += 1) {
    const match = pathMatches[index];
    const nextMatch = pathMatches[index + 1];
    const template = normalizeOpenApiPath(match?.[1] ?? "");
    const start = (match?.index ?? 0) + (match?.[0].length ?? 0);
    const end = nextMatch?.index ?? section.length;
    const pathBlock = section.slice(start, end);
    const methodMatches = Array.from(pathBlock.matchAll(/^\s{4}(get|post|put|patch|delete):\s*$/gmu));

    for (let methodIndex = 0; methodIndex < methodMatches.length; methodIndex += 1) {
      const methodMatch = methodMatches[methodIndex];
      const nextMethodMatch = methodMatches[methodIndex + 1];
      const method = String(methodMatch?.[1] ?? "").toUpperCase();
      const methodStart = (methodMatch?.index ?? 0) + (methodMatch?.[0].length ?? 0);
      const methodEnd = nextMethodMatch?.index ?? pathBlock.length;
      const methodBlock = pathBlock.slice(methodStart, methodEnd);
      const riskLevel = normalizeRiskLevel(
        methodBlock.match(/^\s{6}x-codex-risk:\s*(low|elevated|high)\s*$/mu)?.[1],
        method,
      );
      const reasons = readRiskReasons(methodBlock);

      if (template && method) {
        operations.push({
          template,
          method,
          riskLevel,
          reasons,
        });
      }
    }
  }

  return operations;
}

async function findDocumentedOpenApiOperation(
  workspaceRoot: string,
  method: string,
  pathname: string,
) {
  const operations = await readDocumentedOpenApiOperations(workspaceRoot);
  return operations.find(
    (operation) =>
      operation.method === method &&
      openApiTemplateMatchesPath(operation.template, pathname),
  ) ?? null;
}

async function searchTextFiles(files: string[], query: string, maxResults: number) {
  const normalizedQuery = query.toLowerCase();
  const results: Array<{ file: string; line: number; text: string }> = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8").catch(() => "");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (results.length >= maxResults) {
        return;
      }

      if (line.toLowerCase().includes(normalizedQuery)) {
        results.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }

  return results;
}

async function collectDocsFiles(workspaceRoot: string) {
  const files = [path.join(workspaceRoot, "README.md")];
  const docsRoot = path.join(workspaceRoot, "docs");
  const docsEntries = await fs.readdir(docsRoot, { recursive: true }).catch(() => []);

  for (const entry of docsEntries) {
    const candidate = path.join(docsRoot, String(entry));
    const stat = await fs.stat(candidate).catch(() => null);

    if (stat?.isFile() && /\.(md|txt|yaml|yml)$/i.test(candidate)) {
      files.push(candidate);
    }
  }

  return files;
}

function getInternalApiBaseUrl() {
  return (process.env.CODEX_INTERNAL_API_URL || `http://127.0.0.1:${Number(process.env.PORT) || 4000}/api`).replace(/\/$/, "");
}

async function executeInternalApi(params: Record<string, unknown>, context: CodexToolRunContext): Promise<CodexToolRunResult> {
  const method = String(params.method).toUpperCase();
  const pathValue = String(params.path);
  const normalizedPath = normalizeOpenApiPath(pathValue);

  if (!pathValue.startsWith("/") || /^https?:\/\//i.test(pathValue)) {
    throw new Error("Path interno deve iniciar com / e não pode conter host.");
  }

  const documentedOperation = await findDocumentedOpenApiOperation(
    context.workspaceRoot,
    method,
    normalizedPath,
  );

  if (!documentedOperation) {
    return {
      ok: false,
      toolId: "execute_internal_api",
      requiresConfirmation: false,
      summary: `A operação ${method} ${normalizedPath} nao esta documentada no OpenAPI e precisa entrar no contrato antes do uso pelo agente.`,
      error: {
        status: 400,
        kind: "validation",
        message: `Operação ${method} ${normalizedPath} fora do OpenAPI.`,
        nextStep: "Adicione o endpoint e método ao openapi.yaml antes de usar execute_internal_api para esse recurso.",
      },
      data: { method, path: pathValue },
    };
  }

  if (documentedOperation.riskLevel !== "low" && !context.confirmed) {
    return {
      ok: false,
      toolId: "execute_internal_api",
      requiresConfirmation: true,
      summary: `A chamada ${method} ${pathValue} foi classificada como risco ${documentedOperation.riskLevel} e precisa de confirmação antes da execução.`,
      data: {
        method,
        path: pathValue,
        body: params.body ?? null,
        riskLevel: documentedOperation.riskLevel,
        reasons: documentedOperation.reasons,
        documentedAs: documentedOperation.template,
      },
    };
  }

  const response = await fetch(`${getInternalApiBaseUrl()}${pathValue}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolveCodexServiceToken()}`,
      ...(context.cookieHeader ? { Cookie: context.cookieHeader } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(params.body ?? {}),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    return {
      ok: false,
      toolId: "execute_internal_api",
      requiresConfirmation: false,
      summary: `A API retornou erro ${response.status}.`,
      error: normalizeApiError(
        response.status,
        typeof payload === "string"
          ? payload
          : typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "Request failed.",
      ),
      data: payload,
    };
  }

  return {
    ok: true,
    toolId: "execute_internal_api",
    requiresConfirmation: false,
    summary: `Chamada ${method} ${pathValue} executada com sucesso.`,
    data: payload,
  };
}

export async function runCodexRuntimeTool(toolId: string, params: unknown, context: CodexToolRunContext): Promise<CodexToolRunResult> {
  const tool = getCodexRuntimeTool(toolId);

  if (!tool) {
    throw new Error("Ferramenta Codex não encontrada.");
  }

  const validParams = validateToolParams(tool, params);
  const maxResults = readMaxResults(validParams.maxResults);

  if (tool.id === "search_openapi_spec") {
    const file = path.join(context.workspaceRoot, "api", "codex", "openapi.yaml");
    const results = await searchTextFiles([file], normalizeQuery(validParams.query), maxResults);

    return {
      ok: true,
      toolId: tool.id,
      requiresConfirmation: false,
      summary: results.length ? "OpenAPI consultado com sucesso." : "Nenhum trecho encontrado no OpenAPI.",
      data: { results },
    };
  }

  if (tool.id === "search_project_docs") {
    const files = await collectDocsFiles(context.workspaceRoot);
    const results = await searchTextFiles(files, normalizeQuery(validParams.query), maxResults);

    return {
      ok: true,
      toolId: tool.id,
      requiresConfirmation: false,
      summary: results.length ? "Documentação local consultada com sucesso." : "Nenhum trecho encontrado na documentação local.",
      data: { results },
    };
  }

  if (tool.id === "search_dashboard_pages") {
    const query = normalizeQuery(validParams.query);
    const results = DASHBOARD_PAGES
      .filter((page) => [page.title, page.path, ...page.keywords].join(" ").toLowerCase().includes(query))
      .slice(0, maxResults);

    return {
      ok: true,
      toolId: tool.id,
      requiresConfirmation: false,
      summary: results.length ? "Páginas do painel encontradas." : "Nenhuma página do painel encontrada.",
      data: { results },
    };
  }

  if (tool.id === "normalize_api_error") {
    const error = normalizeApiError(Number(validParams.status), typeof validParams.message === "string" ? validParams.message : undefined);

    return {
      ok: true,
      toolId: tool.id,
      requiresConfirmation: false,
      summary: error.nextStep,
      data: error,
    };
  }

  if (tool.id === "execute_internal_api") {
    return executeInternalApi(validParams, context);
  }

  throw new Error("Ferramenta sem executor registrado.");
}
