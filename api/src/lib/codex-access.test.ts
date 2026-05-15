import { describe, expect, test } from "bun:test";

import { resolveCodexAccessState } from "./codex-access";

describe("codex access state", () => {
  test("habilita quando existe token delegado do sistema", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const state = await resolveCodexAccessState("admin-1");

    expect(state).toEqual({
      codexAccessTokenActive: true,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
      activeToken: null,
    });

    delete process.env.CODEX_ACCESS_TOKEN;
  });

  test("nao exige token manual quando o usuario existe", async () => {
    delete process.env.CODEX_ACCESS_TOKEN;

    const state = await resolveCodexAccessState("admin-1");

    expect(state).toEqual({
      codexAccessTokenActive: true,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
      activeToken: null,
    });
  });
});
