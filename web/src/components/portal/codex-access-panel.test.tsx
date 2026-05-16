import { describe, expect, test } from "bun:test";

import { buildTokenStatusText } from "./codex-access-panel";
import {
  canStartCodexDeviceLogin,
  canUseCodexChat,
  formatCodexReasoningLines,
  formatCodexErrorMessage,
  isCodexAccessBlocked,
  appendOptimisticUserEntry,
  isCodexReasoningEntry,
  removeOptimisticUserEntries,
  summarizeCodexCommand,
} from "./codex-drawer";
import type { CodexTimelineEntry } from "@/types/codex";

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

  test("mostra mensagem amigavel quando o limite do codex acaba", () => {
    expect(
      formatCodexErrorMessage("Codex exec encerrou com code=1: usage limit reached for this account"),
    ).toBe(
      "O limite de uso do Codex foi atingido. Aguarde a renovacao do limite ou conecte outra conta com acesso disponivel.",
    );
  });

  test("resume comandos tecnicos em texto curto para o fluxo normal", () => {
    expect(summarizeCodexCommand("/bin/sh -lc 'sed -n \"1,260p\" /app/codex/openapi.yaml'")).toBe(
      "Validando contrato da API...",
    );
    expect(summarizeCodexCommand("/bin/sh -lc 'bun - <<BUN fetch(\"http://127.0.0.1:4000/api/vct/times\") BUN'")).toBe(
      "Executando chamadas de API...",
    );
  });

  test("mantem a mensagem do usuario imediatamente e remove o placeholder pending quando a confirmacao chega", () => {
    const list = appendOptimisticUserEntry([], null, "quais sao os nomes dos times inscritos", null);
    const cleaned = removeOptimisticUserEntries(
      list as CodexTimelineEntry[],
      "quais sao os nomes dos times inscritos",
      "thread-1",
    );

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      kind: "user",
      text: "quais sao os nomes dos times inscritos",
    });
    expect(cleaned).toHaveLength(0);
  });

  test("identifica itens de reasoning para renderizacao expansivel", () => {
    expect(isCodexReasoningEntry({
      id: "reasoning-1",
      kind: "system",
      text: "vou validar o endpoint antes",
      status: "reasoning",
      turnId: "turn-1",
    })).toBe(true);
  });

  test("resume reasoning em linhas curtas e diretas", () => {
    expect(
      formatCodexReasoningLines("vou validar o endpoint antes. Depois confirmo o retorno."),
    ).toEqual([
      "vou validar o endpoint antes.",
      "Depois confirmo o retorno.",
    ]);
  });
});
