import { describe, expect, mock, test } from "bun:test";
import type { Request, Response } from "express";

import {
  createAdminAccessTokenHandler,
  listAdminAccessTokensHandler,
  revokeAdminAccessTokenHandler,
} from "./admin-access-token.controller";

type MockResponse = Partial<Response> & {
  statusCode?: number;
  body?: unknown;
};

function makeResponse(): MockResponse {
  const res: MockResponse = {};
  res.status = mock((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = mock((body: unknown) => {
    res.body = body;
    return res as Response;
  });
  return res;
}

describe("admin access token controller", () => {
  test("lista tokens do admin atual", async () => {
    const req = { user: { id: "admin-1", role: "admin" } } as Request;
    const res = makeResponse();

    await listAdminAccessTokensHandler(req, res as Response, {
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

    expect(res.body).toEqual({
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
    const req = {
      user: { id: "admin-1", role: "admin" },
      body: { type: "codex", label: "Codex" },
    } as Request;
    const res = makeResponse();

    await createAdminAccessTokenHandler(req, res as Response, {
      createAdminAccessToken: async () => ({
        id: "token-1",
        plaintextToken: "at_secret",
      }),
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      tokenId: "token-1",
      token: "at_secret",
      type: "codex",
      label: "Codex",
    });
  });

  test("revoga token do admin atual", async () => {
    const req = {
      user: { id: "admin-1", role: "admin" },
      params: { tokenId: "token-1" },
    } as Request;
    const res = makeResponse();

    await revokeAdminAccessTokenHandler(req, res as Response, {
      revokeAdminAccessToken: async () => true,
    });

    expect(res.body).toEqual({
      ok: true,
      revoked: true,
      tokenId: "token-1",
    });
  });
});
