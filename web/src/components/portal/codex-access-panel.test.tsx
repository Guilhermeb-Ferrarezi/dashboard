import { describe, expect, test } from "bun:test";

import { buildTokenStatusText } from "./codex-access-panel";
import { isCodexAccessBlocked } from "./codex-drawer";

describe("codex access panel", () => {
  test("mostra o estado gerenciado quando nao existe token manual ativo", () => {
    expect(buildTokenStatusText(false)).toBe("Gerenciado pelo sistema");
  });

  test("nao considera o codex bloqueado quando o backend nao exige token manual", () => {
    expect(
      isCodexAccessBlocked({
        connected: false,
        authMode: null,
        requiresOpenaiAuth: true,
        planType: null,
        email: null,
        sharedAccountLabel: null,
        codexAccessTokenActive: false,
        codexAccessTokenRequired: false,
        codexAccessBlockedReason: null,
      }),
    ).toBe(false);
  });
});
