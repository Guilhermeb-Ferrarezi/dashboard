import { describe, expect, test } from "bun:test";

import { buildTokenStatusText } from "./codex-access-panel";
import { isCodexAccessBlocked } from "./codex-drawer";

describe("codex access panel", () => {
  test("mostra bloqueio quando nao existe token ativo", () => {
    expect(buildTokenStatusText(false)).toBe("Bloqueado");
  });

  test("considera o codex bloqueado quando o backend diz que nao ha token", () => {
    expect(
      isCodexAccessBlocked({
        connected: false,
        authMode: null,
        requiresOpenaiAuth: true,
        planType: null,
        email: null,
        sharedAccountLabel: null,
        codexAccessTokenActive: false,
        codexAccessTokenRequired: true,
        codexAccessBlockedReason: "Crie um token de acesso.",
      }),
    ).toBe(true);
  });
});
