import { describe, expect, test } from "bun:test";

import {
  createAdminAccessTokenHandler,
  listAdminAccessTokensHandler,
  revokeAdminAccessTokenHandler,
} from "./admin-access-token.controller";
import { createMockContext } from "../test-utils/mock-context";

describe("admin access token controller", () => {
  test("lista tokens do admin atual", async () => {
    const c = createMockContext({ user: { id: "admin-1", role: "admin" } });

    const response = await listAdminAccessTokensHandler(c, {
      listAdminAccessTokens: async () => [
        {
          id: "token-1",
          adminId: "admin-1",
          type: "codex",
          label: "Codex",
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
          adminId: "admin-1",
          type: "codex",
          label: "Codex",
          revokedAt: null,
          lastUsedAt: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });
  });

  test("cria token e retorna o valor bruto apenas uma vez", async () => {
    const c = createMockContext({
      user: { id: "admin-1", role: "admin" },
      body: { type: "codex", label: "Codex" },
    });

    const response = await createAdminAccessTokenHandler(c, {
      createAdminAccessToken: async () => ({
        id: "token-1",
        plaintextToken: "at_secret",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toEqual({
      ok: true,
      tokenId: "token-1",
      token: "at_secret",
      type: "codex",
      label: "Codex",
    });
  });

  test("revoga token do admin atual", async () => {
    const c = createMockContext({
      user: { id: "admin-1", role: "admin" },
      params: { tokenId: "token-1" },
    });

    const response = await revokeAdminAccessTokenHandler(c, {
      revokeAdminAccessToken: async () => true,
    });

    const data = await response.json();
    expect(data).toEqual({
      ok: true,
      revoked: true,
      tokenId: "token-1",
    });
  });
});
