import { afterEach, describe, expect, test } from "bun:test";

import { UserAccessToken } from "../models/UserAccessToken";
import { User } from "../models/User";
import { verifyJWTOrCodexServiceToken } from "./codex-service-auth";
import { createMockContext } from "../test-utils/mock-context";
import { createTestSessionToken } from "../test-utils/create-session-token";

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

describe("codex service auth", () => {
  test("aceita o token delegado do sistema sem cookie de sessao", async () => {
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";

    const c = createMockContext({
      headers: {
        authorization: "Bearer codex_service_token",
      },
    });
    let nextCalled = false;

    await verifyJWTOrCodexServiceToken(c, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(c.get("user")?.role).toBe("admin");
  });

  test("aceita um JWT de sessao valido de usuario comum", async () => {
    const secret = "test_secret";
    process.env.JWT_SECRET = secret;

    const token = await createTestSessionToken(
      { userId: 123, login: "alice", email: "alice@example.com", role: 0 },
      secret,
    );

    const c = createMockContext({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    let nextCalled = false;

    await verifyJWTOrCodexServiceToken(c, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(c.get("user")?.id).toBe("123");
    expect(c.get("user")?.role).toBe("user");
  });

  test("aceita token de serviço com usuário delegado", async () => {
    const secret = "test_secret";
    process.env.CODEX_ACCESS_TOKEN = "codex_service_token";
    process.env.JWT_SECRET = secret;

    // Gera um token de sessão no formato customizado que o middleware espera
    const userToken = await createTestSessionToken(
      { userId: 123, login: "Admin", email: "admin@santos.tech", role: 1 },
      secret,
    );

    const c = createMockContext({
      headers: {
        authorization: "Bearer codex_service_token",
        "x-codex-user-id": "123",
        "x-codex-user-token": userToken,
      },
    });
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      verifyJWTOrCodexServiceToken(c, async () => {
        nextCalled = true;
        resolve();
      });
    });

    expect(nextCalled).toBe(true);
    expect(c.get("user")?.id).toBe("123");
    expect(c.get("user")?.email).toBe("admin@santos.tech");
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

    const c = createMockContext({
      headers: {
        authorization: "Bearer uat_secret",
      },
    });
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      verifyJWTOrCodexServiceToken(c, async () => {
        nextCalled = true;
        resolve();
      });
    });

    expect(nextCalled).toBe(true);
    expect(c.get("user")?.id).toBe("user-123");
    expect(c.get("user")?.role).toBe("user");
  });

  test("rejeita quando nenhum token esta presente", async () => {
    const c = createMockContext({
      headers: {},
    });
    let nextCalled = false;

    const response = await verifyJWTOrCodexServiceToken(c, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect((response as Response).status).toBe(401);
  });
});
