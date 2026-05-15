import { describe, expect, test } from "bun:test";

import { buildCodexOperationalPrompt } from "./codex-agent-runtime";

describe("codex agent runtime", () => {
  test("expõe a regra de contrato OpenAPI para consultas de negocio", () => {
    const prompt = buildCodexOperationalPrompt("tem quantos times inscritos?");

    expect(prompt).toContain("Consultas de negocio devem usar endpoint interno documentado no OpenAPI.");
    expect(prompt).toContain("CODEX_INTERNAL_API_URL");
    expect(prompt).toContain("CODEX_INTERNAL_API_TOKEN");
    expect(prompt).toContain("Se a rota existir no codigo, mas nao estiver no OpenAPI, pare e informe");
    expect(prompt).toContain("Nao use bloco de código para endpoint curto");
  });
});
