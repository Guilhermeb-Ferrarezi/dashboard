import { describe, expect, test } from "bun:test";

import {
  resolveCodexAccountStatus,
  resolveCodexAccountStatusForAdmin,
  resolveCodexThreadList,
} from "./codex.controller";

describe("codex controller fallbacks", () => {
  test("retorna status desconectado quando o Codex falha ao carregar a conta", async () => {
    const account = await resolveCodexAccountStatus(async () => {
      throw new Error("codex indisponivel");
    });

    expect(account).toEqual({
      connected: false,
      authMode: null,
      requiresOpenaiAuth: true,
      planType: null,
      email: null,
      sharedAccountLabel: null,
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason:
        "Crie um token de acesso do Codex nas configuracoes do admin.",
    });
  });

  test("bloqueia o Codex quando o admin nao possui token ativo", async () => {
    let called = false;

    const account = await resolveCodexAccountStatusForAdmin(
      "admin-1",
      async () => {
        called = true;
        throw new Error("nao deveria ser chamado");
      },
      async () => ({
        codexAccessTokenActive: false,
        codexAccessTokenRequired: true,
        codexAccessBlockedReason:
          "Crie um token de acesso do Codex nas configuracoes do admin.",
        activeToken: null,
      }),
    );

    expect(called).toBe(false);
    expect(account).toEqual({
      connected: false,
      authMode: null,
      requiresOpenaiAuth: true,
      planType: null,
      email: null,
      sharedAccountLabel: null,
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason:
        "Crie um token de acesso do Codex nas configuracoes do admin.",
    });
  });

  test("retorna lista vazia quando o Codex falha ao carregar as threads", async () => {
    const threads = await resolveCodexThreadList("user-1", async () => {
      throw new Error("codex indisponivel");
    });

    expect(threads).toEqual([]);
  });
});
