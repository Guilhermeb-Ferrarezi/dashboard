import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  listCodexRuntimeTools,
  normalizeApiError,
  runCodexRuntimeTool,
} from "./codex-tool-runtime";

type FetchInput = Parameters<typeof fetch>[0];

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-tools-"));
  fs.mkdirSync(path.join(root, "api", "codex"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "api", "codex", "openapi.yaml"),
    [
      "paths:",
      "  /codex/account:",
      "    get:",
      "      summary: Read Codex account status",
      "  /admin/tokens:",
      "    post:",
      "      x-codex-risk: elevated",
      "      x-codex-risk-reasons:",
      "        - Cria credencial administrativa.",
      "      summary: Create admin access token",
      "  /user/preferences:",
      "    put:",
      "      x-codex-risk: low",
      "      summary: Update current user preferences",
      "  /vct/inscricao/{id}:",
      "    put:",
      "      x-codex-risk: elevated",
      "      summary: Update VCT registration",
      "  /vct/inscricao/{id}/status:",
      "    patch:",
      "      x-codex-risk: elevated",
      "      summary: Update VCT registration status",
      "  /vct/inscricoes:",
      "    get:",
      "      summary: List VCT registrations",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(root, "README.md"), "# Santos Tech Home\n\nCodex runtime docs.\n");
  return root;
}

describe("codex tool runtime", () => {
  test("lista ferramentas com schemas fixos", () => {
    const tools = listCodexRuntimeTools();

    expect(tools.map((tool) => tool.id)).toEqual([
      "search_openapi_spec",
      "search_project_docs",
      "execute_internal_api",
      "search_dashboard_pages",
      "normalize_api_error",
    ]);
    expect(tools[0]?.parameters.required).toEqual(["query"]);
  });

  test("busca trechos no OpenAPI local", async () => {
    const root = createWorkspace();
    const result = await runCodexRuntimeTool(
      "search_openapi_spec",
      { query: "account" },
      { workspaceRoot: root },
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toBe("OpenAPI consultado com sucesso.");
    expect((result.data as { results: unknown[] }).results.length).toBeGreaterThan(0);
  });

  test("bloqueia escrita de API interna sem confirmacao", async () => {
    const result = await runCodexRuntimeTool(
      "execute_internal_api",
      { method: "POST", path: "/admin/tokens", body: { type: "codex" } },
      { workspaceRoot: createWorkspace(), confirmed: false },
    );

    expect(result.ok).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
  });

  test("bloqueia path interno fora do OpenAPI", async () => {
    const fetchCalls: string[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: FetchInput) => {
      fetchCalls.push(String(input));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await runCodexRuntimeTool(
        "execute_internal_api",
        { method: "GET", path: "/vct/times" },
        { workspaceRoot: createWorkspace(), confirmed: false },
      );

      expect(result.ok).toBe(false);
      expect(result.summary).toContain("nao esta documentada no OpenAPI");
      expect(fetchCalls).toHaveLength(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("bloqueia método interno fora do OpenAPI mesmo quando o path existe", async () => {
    const result = await runCodexRuntimeTool(
      "execute_internal_api",
      { method: "DELETE", path: "/vct/inscricoes" },
      { workspaceRoot: createWorkspace(), confirmed: false },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toContain("DELETE /vct/inscricoes");
    expect(result.requiresConfirmation).toBe(false);
  });

  test("aceita paths parametrizados documentados e usa risco da operação", async () => {
    const result = await runCodexRuntimeTool(
      "execute_internal_api",
      { method: "PATCH", path: "/vct/inscricao/abc123/status", body: { status: "inactive" } },
      { workspaceRoot: createWorkspace(), confirmed: false },
    );

    expect(result.ok).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.summary).toContain("risco elevated");
  });

  test("executa escrita de baixo risco sem confirmação quando OpenAPI permite", async () => {
    const originalFetch = globalThis.fetch;
    const originalToken = process.env.CODEX_ACCESS_TOKEN;

    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    globalThis.fetch = (async (_input: FetchInput, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      return new Response(JSON.stringify({ ok: true, preferences: { theme: "dark" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await runCodexRuntimeTool(
        "execute_internal_api",
        { method: "PUT", path: "/user/preferences", body: { theme: "dark" } },
        { workspaceRoot: createWorkspace(), confirmed: false },
      );

      expect(result.ok).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.CODEX_ACCESS_TOKEN = originalToken;
    }
  });

  test("permite path interno documentado no OpenAPI", async () => {
    const originalFetch = globalThis.fetch;
    const originalToken = process.env.CODEX_ACCESS_TOKEN;

    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    globalThis.fetch = (async (_input: FetchInput, init?: RequestInit) => {
      expect(init?.headers).toBeDefined();
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer codex_service_token");
      return new Response(JSON.stringify({ ok: true, inscricoes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await runCodexRuntimeTool(
        "execute_internal_api",
        { method: "GET", path: "/vct/inscricoes?modalidade=valorant" },
        { workspaceRoot: createWorkspace(), confirmed: false },
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe("Chamada GET /vct/inscricoes?modalidade=valorant executada com sucesso.");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.CODEX_ACCESS_TOKEN = originalToken;
    }
  });

  test("normaliza erros conhecidos", () => {
    expect(normalizeApiError(403, "forbidden")).toEqual({
      status: 403,
      kind: "permission",
      message: "forbidden",
      nextStep: "Informe que a conta não tem permissão para essa ação.",
    });
  });

  test("rejeita parametro inexistente", async () => {
    await expect(
      runCodexRuntimeTool(
        "search_openapi_spec",
        { query: "account", banana: true },
        { workspaceRoot: createWorkspace() },
      ),
    ).rejects.toThrow("Parâmetro não suportado: banana.");
  });
});
