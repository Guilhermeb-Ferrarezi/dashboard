import { afterEach, describe, expect, mock, test } from "bun:test";

import { UserAccessToken } from "../models/UserAccessToken";
import { resolveCodexAccessState } from "./codex-access";

describe("codex access state", () => {
  const originalFind = UserAccessToken.find;

  afterEach(() => {
    UserAccessToken.find = originalFind;
  });

  test("habilita quando existe token codex ativo do usuario", async () => {
    UserAccessToken.find = mock(() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: "token-1",
            userId: "admin-1",
            type: "codex",
            label: "Codex",
            revokedAt: null,
            lastUsedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          },
        ],
      }),
    })) as typeof UserAccessToken.find;

    const state = await resolveCodexAccessState("admin-1");

    expect(state).toEqual({
      codexAccessTokenActive: true,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
      activeToken: null,
    });
  });

  test("bloqueia quando o usuario ainda nao criou token codex", async () => {
    UserAccessToken.find = mock(() => ({
      sort: () => ({
        lean: async () => [],
      }),
    })) as typeof UserAccessToken.find;

    const state = await resolveCodexAccessState("admin-1");

    expect(state).toEqual({
      codexAccessTokenActive: false,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: "Crie um token Codex em Configuracoes do usuario > Acesso Codex.",
      activeToken: null,
    });
  });
});
