import { describe, expect, test } from "bun:test";

import { resolveCodexAccessState } from "./codex-access";

describe("codex access state", () => {
  test("habilita quando existe token delegado do sistema", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const state = await resolveCodexAccessState("admin-1", async () => null);

    expect(state).toEqual({
      codexAccessTokenActive: true,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
      activeToken: null,
    });

    delete process.env.CODEX_ACCESS_TOKEN;
  });

  test("continua expondo token manual ativo quando ele existe", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

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
      codexAccessTokenRequired: false,
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

    delete process.env.CODEX_ACCESS_TOKEN;
  });
});
