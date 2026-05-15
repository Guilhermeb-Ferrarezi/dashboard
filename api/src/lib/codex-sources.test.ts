import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildCodexAgentCapabilities } from "./codex-sources";

describe("codex sources", () => {
  test("expõe o catálogo base com fontes e ferramentas", () => {
    const capabilities = buildCodexAgentCapabilities("/workspace", "workspace-write");

    expect(capabilities.executionMode).toBe("workspace-write");
    expect(capabilities.sources.map((source) => source.id)).toEqual([
      "conversation-context",
      "project-documentation",
      "project-openapi",
      "workspace-files",
      "web-docs",
    ]);
    expect(capabilities.tools.map((tool) => tool.id)).toEqual([
      "workspace.read",
      "workspace.write",
      "workspace.execute",
      "web.search",
      "ui.present",
    ]);
    expect(capabilities.selectionPolicy).toEqual([
      "Precisão primeiro.",
      "Completude em segundo.",
      "Velocidade apenas como desempate.",
    ]);
    expect(capabilities.routingRules.map((rule) => rule.intent)).toContain("validar-endpoint");
    expect(capabilities.responsePolicy).toContain(
      "Estruture a resposta por etapas lógicas.",
    );
    expect(capabilities.suggestOnlyRules).toContain(
      "Peça escolha quando houver múltiplas opções com trade-offs reais.",
    );
  });

  test("marca docs e openapi como disponíveis quando existem no workspace", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-sources-"));
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "api", "codex"), { recursive: true });
    fs.writeFileSync(path.join(root, "README.md"), "# Test");
    fs.writeFileSync(path.join(root, "api", "codex", "openapi.yaml"), "openapi: 3.0.3");

    const capabilities = buildCodexAgentCapabilities(root, "exec");
    const docs = capabilities.sources.find((source) => source.id === "project-documentation");
    const openapi = capabilities.sources.find((source) => source.id === "project-openapi");

    expect(docs?.available).toBe(true);
    expect(openapi?.available).toBe(true);
  });
});
