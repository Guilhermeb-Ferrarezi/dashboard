import { afterEach, describe, expect, mock, test } from "bun:test";

import { AdminAccessToken } from "../models/AdminAccessToken";
import { decryptSecret, encryptSecret } from "./token-vault";
import {
  authenticateAdminAccessToken,
  createAdminAccessToken,
  createAdminAccessTokenValue,
  getActiveAdminAccessToken,
  hashAdminAccessToken,
  listAdminAccessTokens,
  revokeAdminAccessToken,
} from "./admin-access-token";

describe("admin access token helpers", () => {
  test("gera um token forte e hash deterministico", () => {
    const token = createAdminAccessTokenValue();

    expect(token).toMatch(/^at_/);
    expect(token.length).toBeGreaterThan(32);
    expect(hashAdminAccessToken(token)).toBe(hashAdminAccessToken(token));
    expect(hashAdminAccessToken(token)).not.toBe(token);
  });

  test("criptografa e descriptografa o valor bruto", () => {
    const secret = "unit-test-secret";
    const encrypted = encryptSecret("at_secret", secret);

    expect(encrypted).toContain("v1:");
    expect(decryptSecret(encrypted, secret)).toBe("at_secret");
  });
});

describe("admin access token service", () => {
  const originalUpdateMany = AdminAccessToken.updateMany;
  const originalCreate = AdminAccessToken.create;
  const originalFind = AdminAccessToken.find;
  const originalFindOne = AdminAccessToken.findOne;
  const originalUpdateOne = AdminAccessToken.updateOne;

  afterEach(() => {
    AdminAccessToken.updateMany = originalUpdateMany;
    AdminAccessToken.create = originalCreate;
    AdminAccessToken.find = originalFind;
    AdminAccessToken.findOne = originalFindOne;
    AdminAccessToken.updateOne = originalUpdateOne;
  });

  test("revoke previous codex token before creating a new one", async () => {
    let revokedCount = 0;
    AdminAccessToken.updateMany = mock((_filter: unknown, update: Record<string, unknown>) => {
      if (update.$set?.revokedAt) {
        revokedCount += 1;
      }

      return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
    }) as typeof AdminAccessToken.updateMany;

    AdminAccessToken.create = mock(async (payload: Record<string, unknown>) => ({
      _id: "token-1",
      ...payload,
    })) as typeof AdminAccessToken.create;

    const result = await createAdminAccessToken({
      adminId: "admin-1",
      type: "codex",
      label: "Codex",
    });

    expect(revokedCount).toBe(1);
    expect(result.id).toBe("token-1");
    expect(result.plaintextToken).toMatch(/^at_/);
    expect(AdminAccessToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "admin-1",
        type: "codex",
        label: "Codex",
        tokenHash: expect.any(String),
        encryptedToken: expect.any(String),
      }),
    );
  });

  test("lista tokens sem expor o hash bruto", async () => {
    AdminAccessToken.find = mock(() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: "token-1",
            adminId: "admin-1",
            type: "codex",
            label: "Codex",
            tokenHash: "hashed",
            revokedAt: null,
            lastUsedAt: null,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          },
        ],
      }),
    })) as typeof AdminAccessToken.find;

    const tokens = await listAdminAccessTokens("admin-1");

    expect(tokens).toEqual([
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
    ]);
  });

  test("revoga token ativo do admin", async () => {
    AdminAccessToken.updateOne = mock(() => Promise.resolve({ acknowledged: true, modifiedCount: 1 })) as typeof AdminAccessToken.updateOne;

    await expect(revokeAdminAccessToken("admin-1", "token-1")).resolves.toBe(true);
  });

  test("retorna o token ativo do tipo solicitado", async () => {
    AdminAccessToken.findOne = mock(() => ({
      lean: async () => ({
        _id: "token-1",
        adminId: "admin-1",
        type: "codex",
        label: "Codex",
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      }),
    })) as typeof AdminAccessToken.findOne;

    const token = await getActiveAdminAccessToken("admin-1", "codex");

    expect(token).toEqual({
      id: "token-1",
      adminId: "admin-1",
      type: "codex",
      label: "Codex",
      revokedAt: null,
      lastUsedAt: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });
  });

  test("autentica token pelo valor bruto e atualiza lastUsedAt", async () => {
    AdminAccessToken.findOneAndUpdate = mock(() => ({
      lean: async () => ({
        _id: "token-1",
        adminId: "admin-1",
        type: "codex",
        label: "Codex",
        revokedAt: null,
        lastUsedAt: new Date("2024-01-03T00:00:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-03T00:00:00.000Z"),
      }),
    })) as typeof AdminAccessToken.findOneAndUpdate;

    const token = await authenticateAdminAccessToken("admin-1", "codex", "at_secret");

    expect(token).toEqual({
      id: "token-1",
      adminId: "admin-1",
      type: "codex",
      label: "Codex",
      revokedAt: null,
      lastUsedAt: "2024-01-03T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-03T00:00:00.000Z",
    });
    expect(AdminAccessToken.findOneAndUpdate).toHaveBeenCalledWith(
      {
        adminId: "admin-1",
        type: "codex",
        revokedAt: null,
        tokenHash: expect.any(String),
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
});
