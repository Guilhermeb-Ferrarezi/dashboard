import { describe, expect, test } from "bun:test";

import { classifyCodexPrompt } from "./codex-confirmation";

describe("codex confirmation", () => {
  test("nao pede confirmacao para leitura", () => {
    expect(classifyCodexPrompt("me mostre o README do projeto")).toEqual({
      requiresConfirmation: false,
      riskLevel: "low",
      reasons: [],
    });
  });

  test("pede confirmacao para acoes destrutivas", () => {
    const result = classifyCodexPrompt("apagar o token e fazer deploy");

    expect(result.requiresConfirmation).toBe(true);
    expect(result.riskLevel).toBe("high");
    expect(result.reasons).toContain("Ação destrutiva.");
    expect(result.reasons).toContain("Pode afetar um ambiente externo.");
  });

  test("pede confirmacao para mudancas elevadas", () => {
    const result = classifyCodexPrompt("alterar o token de acesso");

    expect(result.requiresConfirmation).toBe(true);
    expect(result.riskLevel).toBe("elevated");
    expect(result.reasons).toContain("Toca em segredos ou credenciais.");
    expect(result.reasons).toContain("Solicita uma mudança no estado atual.");
  });

  test("pede confirmacao para criacao de recurso", () => {
    const result = classifyCodexPrompt("criar um bucket R2 chamado assets");

    expect(result.requiresConfirmation).toBe(true);
    expect(result.riskLevel).toBe("elevated");
    expect(result.reasons).toContain("Cria recurso ou estado novo.");
  });
});
