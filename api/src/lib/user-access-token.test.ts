import { afterEach, describe, expect, mock, test } from "bun:test";

import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { decryptSecret, encryptSecret } from "./token-vault";
import {
  authenticateUserAccessToken,
  createUserAccessToken,
  createUserAccessTokenValue,
  hashUserAccessToken,
  listUserAccessTokens,
  revokeUserAccessToken,
  resolveActiveUserAccessTokenValue,
} from "./user-access-token";

describe("user access token helpers", () => {
  test("gera um token forte e hash deterministico", () => {
    const token = createUserAccessTokenValue();

    expect(token).toMatch(/^uat_/);
    expect(token.length).toBeGreaterThan(32);
    expect(hashUserAccessToken(token)).toBe(hashUserAccessToken(token));
    expect(hashUserAccessToken(token)).not.toBe(token);
  });

  test("criptografa e descriptografa o valor bruto", () => {
    const secret = "unit-test-secret";
    const encrypted = encryptSecret("uat_secret", secret);

    expect(encrypted).toContain("v1:");
    expect(decryptSecret(encrypted, secret)).toBe("uat_secret");
  });
});

describe("user access token service", () => {
  const originalCreate = UserAccessToken.create;
  const originalFind = UserAccessToken.find;
  const originalUpdateOne = UserAccessToken.updateOne;
  const originalUpdateMany = UserAccessToken.updateMany;
  const originalFindOneAndUpdate = UserAccessToken.findOneAndUpdate;
  const originalFindById = User.findById;

  afterEach(() => {
    UserAccessToken.create = originalCreate;
    UserAccessToken.find = originalFind;
    UserAccessToken.updateOne = originalUpdateOne;
    UserAccessToken.updateMany = originalUpdateMany;
    UserAccessToken.findOneAndUpdate = originalFindOneAndUpdate;
    User.findById = originalFindById;
  });

  test("cria token persistindo apenas hash e segredo criptografado", async () => {
    UserAccessToken.create = mock(async (payload: Record<string, unknown>) => ({
      _id: "token-1",
      ...payload,
    })) as typeof UserAccessToken.create;

    const result = await createUserAccessToken({
      userId: "user-1",
      label: "Meu bot",
    });

    expect(result.id).toBe("token-1");
    expect(result.plaintextToken).toMatch(/^uat_/);
    expect(UserAccessToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "account",
        label: "Meu bot",
        tokenHash: expect.any(String),
        encryptedToken: expect.any(String),
      }),
    );
  });

  test("revoga o codex anterior antes de criar outro token codex", async () => {
    let revokedCount = 0;

    UserAccessToken.updateMany = mock((_filter: unknown, update: Record<string, unknown>) => {
      if (update.$set?.revokedAt) {
        revokedCount += 1;
      }

      return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
    }) as typeof UserAccessToken.updateMany;

    UserAccessToken.create = mock(async (payload: Record<string, unknown>) => ({
      _id: "token-1",
      ...payload,
    })) as typeof UserAccessToken.create;

    const result = await createUserAccessToken({
      userId: "user-1",
      label: "Codex",
      type: "codex",
    });

    expect(revokedCount).toBe(1);
    expect(result.id).toBe("token-1");
    expect(UserAccessToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "codex",
        label: "Codex",
      }),
    );
  });

  test("lista tokens sem expor o hash bruto", async () => {
    UserAccessToken.find = mock(() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: "token-1",
            userId: "user-1",
            type: "account",
            label: "Meu bot",
            tokenHash: "hashed",
            revokedAt: null,
            lastUsedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          },
        ],
      }),
    })) as typeof UserAccessToken.find;

    const tokens = await listUserAccessTokens("user-1");

    expect(tokens).toEqual([
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
    ]);
  });

  test("revoga token ativo do usuario", async () => {
    UserAccessToken.updateOne = mock(() => Promise.resolve({ acknowledged: true, modifiedCount: 1 })) as typeof UserAccessToken.updateOne;

    await expect(revokeUserAccessToken("user-1", "token-1")).resolves.toBe(true);
  });

  test("autentica token pelo valor bruto e resolve o usuario", async () => {
    UserAccessToken.findOneAndUpdate = mock(() => ({
      lean: async () => ({
      _id: "token-1",
      userId: "user-1",
      type: "account",
      label: "Meu bot",
      revokedAt: null,
      lastUsedAt: new Date("2024-01-03T00:00:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-03T00:00:00.000Z"),
      }),
    })) as typeof UserAccessToken.findOneAndUpdate;

    User.findById = mock(() => ({
      select: () => ({
        lean: async () => ({
          _id: "user-1",
          username: "alice",
          email: "alice@example.com",
          role: "user",
        }),
      }),
    })) as typeof User.findById;

    const result = await authenticateUserAccessToken("uat_secret");

    expect(result).toEqual({
      token: {
        id: "token-1",
        userId: "user-1",
        type: "account",
        label: "Meu bot",
        revokedAt: null,
        lastUsedAt: "2024-01-03T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
      },
      user: {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        role: "user",
      },
    });
    expect(UserAccessToken.findOneAndUpdate).toHaveBeenCalledWith(
      {
        tokenHash: expect.any(String),
        revokedAt: null,
      },
      {
        $set: {
          lastUsedAt: expect.any(Date),
          encryptedToken: expect.any(String),
        },
      },
      { new: true },
    );
  });

  test("resolve o valor ativo do token codex do usuario", async () => {
    UserAccessToken.findOne = mock(() => ({
      sort: () => ({
        select: () => ({
          lean: async () => ({
            _id: "token-1",
            userId: "user-1",
            type: "codex",
            label: "Codex",
            encryptedToken: encryptSecret("codex_user_token"),
            revokedAt: null,
            lastUsedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          }),
        }),
      }),
    })) as typeof UserAccessToken.findOne;

    await expect(resolveActiveUserAccessTokenValue("user-1", "codex")).resolves.toBe(
      "codex_user_token",
    );
  });
});
