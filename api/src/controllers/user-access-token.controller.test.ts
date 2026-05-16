import { describe, expect, mock, test } from "bun:test";
import type { Request, Response } from "express";

import {
  createUserAccessTokenHandler,
  listUserAccessTokensHandler,
  revokeUserAccessTokenHandler,
} from "./user-access-token.controller";

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

describe("user access token controller", () => {
  test("lista tokens do usuario atual", async () => {
    const req = { user: { id: "user-1", role: "user" } } as Request;
    const res = makeResponse();

    await listUserAccessTokensHandler(req, res as Response, {
      listUserAccessTokens: async () => [
        {
          id: "token-1",
          userId: "user-1",
          label: "Meu bot",
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
          userId: "user-1",
          label: "Meu bot",
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
      user: { id: "user-1", role: "user" },
      body: { label: "Meu bot" },
    } as Request;
    const res = makeResponse();

    await createUserAccessTokenHandler(req, res as Response, {
      createUserAccessToken: async () => ({
        id: "token-1",
        plaintextToken: "uat_secret",
      }),
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      tokenId: "token-1",
      token: "uat_secret",
      label: "Meu bot",
    });
  });

  test("revoga token do usuario atual", async () => {
    const req = {
      user: { id: "user-1", role: "user" },
      params: { tokenId: "token-1" },
    } as Request;
    const res = makeResponse();

    await revokeUserAccessTokenHandler(req, res as Response, {
      revokeUserAccessToken: async () => true,
    });

    expect(res.body).toEqual({
      ok: true,
      revoked: true,
      tokenId: "token-1",
    });
  });
});
