import type { Request, Response } from "express";

import {
  createUserAccessToken,
  listUserAccessTokens,
  listUserTokenUsage,
  revokeUserAccessToken,
  validatePermissions,
  type UserAccessTokenType,
} from "../lib/user-access-token";

function getUserId(req: Request) {
  return req.user?.id;
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
  req: Request,
  res: Response,
  deps: UserAccessTokenDeps = {},
) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const type = normalizeType(req.query?.type);
  const tokens = await (deps.listUserAccessTokens ?? listUserAccessTokens)(userId, type ?? undefined);
  return res.json({ ok: true, tokens });
}

export async function createUserAccessTokenHandler(
  req: Request,
  res: Response,
  deps: UserAccessTokenDeps = {},
) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";

  if (!label) {
    return res.status(400).json({ message: "Preencha o nome do token." });
  }

  const requestedType = req.body?.type;
  const type = normalizeType(requestedType);

  if (requestedType !== undefined && !type) {
    return res.status(400).json({ message: "Tipo de token invalido." });
  }

  const permissions = validatePermissions(req.body?.permissions);

  const rawExpiresAt = req.body?.expiresAt;
  let expiresAt: Date | null = null;
  if (rawExpiresAt) {
    const parsed = new Date(rawExpiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Data de expiracao invalida." });
    }
    expiresAt = parsed;
  }

  const description =
    typeof req.body?.description === "string" ? req.body.description.slice(0, 500) : "";

  const created = await (deps.createUserAccessToken ?? createUserAccessToken)({
    userId,
    label,
    type: type ?? "account",
    permissions,
    expiresAt,
    description,
  });

  return res.status(201).json({
    ok: true,
    tokenId: created.id,
    token: created.plaintextToken,
    label,
    type,
  });
}

export async function revokeUserAccessTokenHandler(
  req: Request,
  res: Response,
  deps: UserAccessTokenDeps = {},
) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokenId = Array.isArray(req.params.tokenId)
    ? req.params.tokenId[0]
    : req.params.tokenId;

  if (!tokenId) {
    return res.status(400).json({ message: "Token nao informada." });
  }

  const revoked = await (deps.revokeUserAccessToken ?? revokeUserAccessToken)(userId, tokenId);

  if (!revoked) {
    return res.status(404).json({ message: "Token nao encontrada." });
  }

  return res.json({ ok: true, revoked: true, tokenId });
}

export async function getUserTokenUsageHandler(
  req: Request,
  res: Response,
  deps: UserAccessTokenDeps = {},
) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokenId = Array.isArray(req.params.tokenId)
    ? req.params.tokenId[0]
    : req.params.tokenId;

  if (!tokenId) {
    return res.status(400).json({ message: "Token nao informada." });
  }

  const rawLimit = Number(req.query?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  const logs = await (deps.listUserTokenUsage ?? listUserTokenUsage)(userId, tokenId, limit);
  return res.json({ ok: true, logs });
}
