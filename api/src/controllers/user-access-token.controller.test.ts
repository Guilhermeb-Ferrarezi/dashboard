import { describe, expect, test } from "bun:test";

import {
  createUserAccessTokenHandler,
  listUserAccessTokensHandler,
  revokeUserAccessTokenHandler,
} from "./user-access-token.controller";
import { createMockContext } from "../test-utils/mock-context";

describe("user access token controller", () => {
  test("lista tokens do usuario atual", async () => {
    const c = createMockContext({ user: { id: "user-1", role: "user" } });

    const response = await listUserAccessTokensHandler(c, {
      listUserAccessTokens: async () => [
        {
          id: "token-1",
          userId: "user-1",
          type: "account",
          label: "Meu bot",
          revokedAt: null,
          lastUsedAt: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });

    const data = await response.json();
    expect(data).toEqual({
      ok: true,
      tokens: [
        {
          id: "token-1",
          userId: "user-1",
          type: "account",
          label: "Meu bot",
          revokedAt: null,
          lastUsedAt: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });
  });

  test("filtra tokens pelo tipo solicitado", async () => {
    const c = createMockContext({
      user: { id: "user-1", role: "user" },
      query: { type: "codex" },
    });
    let receivedType: string | undefined;

    const response = await listUserAccessTokensHandler(c, {
      listUserAccessTokens: async (_userId, type) => {
        receivedType = type;
        return [];
      },
    });

    const data = await response.json();
    expect(receivedType).toBe("codex");
    expect(data).toEqual({
      ok: true,
      tokens: [],
    });
  });

  test("cria token e retorna o valor bruto apenas uma vez", async () => {
    const c = createMockContext({
      user: { id: "user-1", role: "user" },
      body: { label: "Meu bot", type: "account" },
    });

    const response = await createUserAccessTokenHandler(c, {
      createUserAccessToken: async () => ({
        id: "token-1",
        plaintextToken: "uat_secret",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toEqual({
      ok: true,
      tokenId: "token-1",
      token: "uat_secret",
      label: "Meu bot",
      type: "account",
    });
  });

  test("cria token do codex quando o modo pede", async () => {
    const c = createMockContext({
      user: { id: "user-1", role: "user" },
      body: { label: "Codex", type: "codex" },
    });

    const response = await createUserAccessTokenHandler(c, {
      createUserAccessToken: async () => ({
        id: "token-1",
        plaintextToken: "uat_secret",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toEqual({
      ok: true,
      tokenId: "token-1",
      token: "uat_secret",
      label: "Codex",
      type: "codex",
    });
  });

  test("revoga token do usuario atual", async () => {
    const c = createMockContext({
      user: { id: "user-1", role: "user" },
      params: { tokenId: "token-1" },
    });

    const response = await revokeUserAccessTokenHandler(c, {
      revokeUserAccessToken: async () => true,
    });

    const data = await response.json();
    expect(data).toEqual({
      ok: true,
      revoked: true,
      tokenId: "token-1",
    });
  });
});
