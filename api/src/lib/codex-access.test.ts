import { describe, expect, test } from "bun:test";

import { resolveCodexAccessState } from "./codex-access";

describe("codex access state", () => {
  test("bloqueia quando nao existe token ativo", async () => {
    const state = await resolveCodexAccessState("admin-1", async () => null);

    expect(state).toEqual({
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason:
        "Crie um token de acesso do Codex nas configuracoes do admin.",
      activeToken: null,
    });
  });

  test("habilita quando existe token ativo", async () => {
    const state = await resolveCodexAccessState("admin-1", async () => ({
      id: "token-1",
      adminId: "admin-1",
      type: "codex",
      label: "Codex",
      revokedAt: null,
      lastUsedAt: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    }));

    expect(state).toEqual({
      codexAccessTokenActive: true,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason: null,
      activeToken: {
        id: "token-1",
        adminId: "admin-1",
        type: "codex",
        label: "Codex",
        revokedAt: null,
        lastUsedAt: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    });
  });
});
