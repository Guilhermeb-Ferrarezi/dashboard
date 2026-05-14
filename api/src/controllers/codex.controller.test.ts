import { describe, expect, test } from "bun:test";

import {
  resolveCodexAccountStatus,
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
    });
  });

  test("retorna lista vazia quando o Codex falha ao carregar as threads", async () => {
    const threads = await resolveCodexThreadList("user-1", async () => {
      throw new Error("codex indisponivel");
    });

    expect(threads).toEqual([]);
  });
});
