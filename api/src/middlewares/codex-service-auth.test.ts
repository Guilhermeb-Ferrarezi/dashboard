import { afterEach, describe, expect, test } from "bun:test";
import jwt from "jsonwebtoken";

import { UserAccessToken } from "../models/UserAccessToken";
import { User } from "../models/User";
import { verifyJWTOrCodexServiceToken } from "./codex-service-auth";

const originalEnv = {
  CODEX_ACCESS_TOKEN: process.env.CODEX_ACCESS_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET,
};
const originalFindById = User.findById;
const originalUserAccessTokenFindOne = UserAccessToken.findOne;
const originalUserAccessTokenUpdateOne = UserAccessToken.updateOne;

afterEach(() => {
  process.env.CODEX_ACCESS_TOKEN = originalEnv.CODEX_ACCESS_TOKEN;
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  User.findById = originalFindById;
  UserAccessToken.findOne = originalUserAccessTokenFindOne;
  UserAccessToken.updateOne = originalUserAccessTokenUpdateOne;
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
  test("aceita o token delegado do sistema sem cookie de sessao", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const req = {
      cookies: {},
      headers: {
        authorization: "Bearer codex_service_token",
      },
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    await verifyJWTOrCodexServiceToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect((req as { user?: { role?: string } }).user?.role).toBe("admin");
  });

  test("aceita um JWT de sessao valido de usuario comum", async () => {
    process.env.JWT_SECRET = "test_secret";

    const req = {
      cookies: {},
      headers: {
        authorization: `Bearer ${jwt.sign(
          { id: "user-123", username: "alice", role: "user" },
          "test_secret",
        )}`,
      },
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    await verifyJWTOrCodexServiceToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect((req as { user?: { id?: string; role?: string } }).user?.id).toBe("user-123");
    expect((req as { user?: { role?: string } }).user?.role).toBe("user");
  });

  test("aceita token de serviço com usuário delegado", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";
    User.findById = (() => ({
      select: () => ({
        lean: () => Promise.resolve({
          _id: "user-123",
          username: "Admin",
          email: "admin@santos.tech",
          role: "admin",
        }),
      }),
    })) as never;

    const req = {
      cookies: {},
      headers: {
        authorization: "Bearer codex_service_token",
        "x-codex-user-id": "user-123",
      },
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      verifyJWTOrCodexServiceToken(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    expect(nextCalled).toBe(true);
    expect((req as { user?: { id?: string; email?: string | null } }).user?.id).toBe("user-123");
    expect((req as { user?: { email?: string | null } }).user?.email).toBe("admin@santos.tech");
  });

  test("aceita token pessoal de API do usuario", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_not_matching";

    UserAccessToken.findOne = (() => ({
      lean: () => Promise.resolve({
        _id: "token-1",
        userId: "user-123",
        type: "account",
        label: "Meu bot",
        permissions: [],
        expiresAt: null,
        description: "",
        revokedAt: null,
        lastUsedAt: new Date("2024-01-03T00:00:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-03T00:00:00.000Z"),
      }),
    })) as never;

    UserAccessToken.updateOne = (() =>
      Promise.resolve({ acknowledged: true, modifiedCount: 1 })
    ) as never;

    User.findById = (() => ({
      select: () => ({
        lean: () => Promise.resolve({
          _id: "user-123",
          username: "alice",
          email: "alice@example.com",
          role: "user",
        }),
      }),
    })) as never;

    const req = {
      cookies: {},
      headers: {
        authorization: "Bearer uat_secret",
      },
      method: "GET",
      path: "/api/test",
      ip: null,
    } as never;
    const res = createResponse() as never;
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      verifyJWTOrCodexServiceToken(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    expect(nextCalled).toBe(true);
    expect((req as { user?: { id?: string; role?: string } }).user?.id).toBe("user-123");
    expect((req as { user?: { role?: string } }).user?.role).toBe("user");
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
