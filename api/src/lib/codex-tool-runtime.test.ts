import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  listCodexRuntimeTools,
  normalizeApiError,
  runCodexRuntimeTool,
} from "./codex-tool-runtime";

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-tools-"));
  fs.mkdirSync(path.join(root, "api", "codex"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "api", "codex", "openapi.yaml"),
    "paths:\n  /codex/account:\n    get:\n      summary: Read Codex account status\n",
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
