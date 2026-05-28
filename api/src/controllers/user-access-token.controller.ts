import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import {
  createUserAccessToken,
  listUserAccessTokens,
  listUserTokenUsage,
  revokeUserAccessToken,
  validatePermissions,
  type UserAccessTokenType,
} from "../lib/user-access-token";

function getUserId(c: Context<AppEnv>) {
  return c.get("user")?.id;
}

type UserAccessTokenDeps = {
  listUserAccessTokens?: typeof listUserAccessTokens;
  createUserAccessToken?: typeof createUserAccessToken;
  revokeUserAccessToken?: typeof revokeUserAccessToken;
  listUserTokenUsage?: typeof listUserTokenUsage;
};

function normalizeType(value: unknown): UserAccessTokenType | null {
  if (value === "account" || value === "codex") {
    return value;
  }

  return null;
}

export async function listUserAccessTokensHandler(
  c: Context<AppEnv>,
  deps: UserAccessTokenDeps = {},
): Promise<Response> {
  const userId = getUserId(c);

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const type = normalizeType(c.req.query("type"));
  const tokens = await (deps.listUserAccessTokens ?? listUserAccessTokens)(userId, type ?? undefined);
  return c.json({ ok: true, tokens });
}

export async function createUserAccessTokenHandler(
  c: Context<AppEnv>,
  deps: UserAccessTokenDeps = {},
): Promise<Response> {
  const userId = getUserId(c);

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const body = await c.req.json();
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (!label) {
    return c.json({ message: "Preencha o nome do token." }, 400);
  }

  const requestedType = body?.type;
  const type = normalizeType(requestedType);

  if (requestedType !== undefined && !type) {
    return c.json({ message: "Tipo de token invalido." }, 400);
  }

  const permissions = validatePermissions(body?.permissions);

  const rawExpiresAt = body?.expiresAt;
  let expiresAt: Date | null = null;
  if (rawExpiresAt) {
    const parsed = new Date(rawExpiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ message: "Data de expiracao invalida." }, 400);
    }
    expiresAt = parsed;
  }

  const description =
    typeof body?.description === "string" ? body.description.slice(0, 500) : "";

  const created = await (deps.createUserAccessToken ?? createUserAccessToken)({
    userId,
    label,
    type: type ?? "account",
    permissions,
    expiresAt,
    description,
  });

  return c.json({
    ok: true,
    tokenId: created.id,
    token: created.plaintextToken,
    label,
    type,
  }, 201);
}

export async function revokeUserAccessTokenHandler(
  c: Context<AppEnv>,
  deps: UserAccessTokenDeps = {},
): Promise<Response> {
  const userId = getUserId(c);

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const tokenId = c.req.param("tokenId");

  if (!tokenId) {
    return c.json({ message: "Token nao informada." }, 400);
  }

  const revoked = await (deps.revokeUserAccessToken ?? revokeUserAccessToken)(userId, tokenId);

  if (!revoked) {
    return c.json({ message: "Token nao encontrada." }, 404);
  }

  return c.json({ ok: true, revoked: true, tokenId });
}

export async function getUserTokenUsageHandler(
  c: Context<AppEnv>,
  deps: UserAccessTokenDeps = {},
): Promise<Response> {
  const userId = getUserId(c);

  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const tokenId = c.req.param("tokenId");

  if (!tokenId) {
    return c.json({ message: "Token nao informada." }, 400);
  }

  const rawLimit = Number(c.req.query("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  const logs = await (deps.listUserTokenUsage ?? listUserTokenUsage)(userId, tokenId, limit);
  return c.json({ ok: true, logs });
}
