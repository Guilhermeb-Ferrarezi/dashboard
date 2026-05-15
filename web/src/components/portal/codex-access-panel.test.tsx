import { describe, expect, test } from "bun:test";

import { buildTokenStatusText } from "./codex-access-panel";
import { canStartCodexDeviceLogin, canUseCodexChat, isCodexAccessBlocked } from "./codex-drawer";

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

  test("nao oferece device login no modo exec", () => {
    expect(
      canStartCodexDeviceLogin(
        {
          connected: false,
          authMode: null,
          requiresOpenaiAuth: true,
          planType: null,
          email: null,
          sharedAccountLabel: null,
          codexAccessTokenActive: true,
          codexAccessTokenRequired: false,
          codexAccessBlockedReason: null,
        },
        "exec",
      ),
    ).toBe(false);
  });

  test("permite usar o chat no modo exec mesmo sem conta compartilhada conectada", () => {
    expect(
      canUseCodexChat(
        {
          connected: false,
          authMode: null,
          requiresOpenaiAuth: true,
          planType: null,
          email: null,
          sharedAccountLabel: null,
          codexAccessTokenActive: true,
          codexAccessTokenRequired: false,
          codexAccessBlockedReason: null,
        },
        "exec",
      ),
    ).toBe(true);
  });
});
