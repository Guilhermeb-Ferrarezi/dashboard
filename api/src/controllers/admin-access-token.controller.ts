import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import {
  createAdminAccessToken,
  getActiveAdminAccessToken,
  listAdminAccessTokens,
  listAdminTokenUsage,
  revokeAdminAccessToken,
  validatePermissions,
} from "../lib/admin-access-token";

function getAdminId(c: Context<AppEnv>) {
  return c.get("user")?.id;
}

type AdminAccessTokenDeps = {
  listAdminAccessTokens?: typeof listAdminAccessTokens;
  createAdminAccessToken?: typeof createAdminAccessToken;
  revokeAdminAccessToken?: typeof revokeAdminAccessToken;
  getActiveAdminAccessToken?: typeof getActiveAdminAccessToken;
  listAdminTokenUsage?: typeof listAdminTokenUsage;
};

export async function listAdminAccessTokensHandler(
  c: Context<AppEnv>,
  deps: AdminAccessTokenDeps = {},
): Promise<Response> {
  const adminId = getAdminId(c);

  if (!adminId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const tokens = await (deps.listAdminAccessTokens ?? listAdminAccessTokens)(adminId);
  return c.json({ ok: true, tokens });
}

export async function createAdminAccessTokenHandler(
  c: Context<AppEnv>,
  deps: AdminAccessTokenDeps = {},
): Promise<Response> {
  const adminId = getAdminId(c);

  if (!adminId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const body = await c.req.json();
  const type = typeof body?.type === "string" ? body.type.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (!type || !label) {
    return c.json({ message: "Preencha tipo e nome do token." }, 400);
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

  const created = await (deps.createAdminAccessToken ?? createAdminAccessToken)({
    adminId,
    type,
    label,
    permissions,
    expiresAt,
    description,
  });

  return c.json({
    ok: true,
    tokenId: created.id,
    token: created.plaintextToken,
    type,
    label,
  }, 201);
}

export async function revokeAdminAccessTokenHandler(
  c: Context<AppEnv>,
  deps: AdminAccessTokenDeps = {},
): Promise<Response> {
  const adminId = getAdminId(c);

  if (!adminId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const tokenId = c.req.param("tokenId");

  if (!tokenId) {
    return c.json({ message: "Token nao informada." }, 400);
  }

  const revoked = await (deps.revokeAdminAccessToken ?? revokeAdminAccessToken)(
    adminId,
    tokenId,
  );

  if (!revoked) {
    return c.json({ message: "Token nao encontrada." }, 404);
  }

  return c.json({ ok: true, revoked: true, tokenId });
}

export async function getCurrentAdminCodexTokenStatus(
  c: Context<AppEnv>,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(c);

  if (!adminId) {
    return null;
  }

  return (deps.getActiveAdminAccessToken ?? getActiveAdminAccessToken)(
    adminId,
    "codex",
  );
}

export async function getAdminTokenUsageHandler(
  c: Context<AppEnv>,
  deps: AdminAccessTokenDeps = {},
): Promise<Response> {
  const adminId = getAdminId(c);

  if (!adminId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const tokenId = c.req.param("tokenId");

  if (!tokenId) {
    return c.json({ message: "Token nao informada." }, 400);
  }

  const rawLimit = Number(c.req.query("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  const logs = await (deps.listAdminTokenUsage ?? listAdminTokenUsage)(adminId, tokenId, limit);
  return c.json({ ok: true, logs });
}
