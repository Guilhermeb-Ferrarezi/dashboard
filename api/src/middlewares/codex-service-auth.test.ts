import { afterEach, describe, expect, test } from "bun:test";

import { verifyJWTOrCodexServiceToken } from "./codex-service-auth";

const originalEnv = {
  CODEX_ACCESS_TOKEN: process.env.CODEX_ACCESS_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET,
};

afterEach(() => {
  process.env.CODEX_ACCESS_TOKEN = originalEnv.CODEX_ACCESS_TOKEN;
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
});

function createResponse() {
  const response = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
}

describe("codex service auth", () => {
  test("aceita o token delegado do sistema sem cookie de sessao", () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const req = {
      cookies: {},
      headers: {
        authorization: "Bearer codex_service_token",
      },
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    verifyJWTOrCodexServiceToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect((req as { user?: { role?: string } }).user?.role).toBe("admin");
  });

  test("rejeita quando nenhum token esta presente", () => {
    const req = {
      cookies: {},
      headers: {},
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    verifyJWTOrCodexServiceToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect((res as { statusCode: number; body: unknown }).statusCode).toBe(401);
  });
});
