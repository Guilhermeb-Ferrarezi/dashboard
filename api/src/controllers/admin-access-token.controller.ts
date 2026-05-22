import type { Request, Response } from "express";

import {
  createAdminAccessToken,
  getActiveAdminAccessToken,
  listAdminAccessTokens,
  listAdminTokenUsage,
  revokeAdminAccessToken,
  validatePermissions,
} from "../lib/admin-access-token";

function getAdminId(req: Request) {
  return req.user?.id;
}

type AdminAccessTokenDeps = {
  listAdminAccessTokens?: typeof listAdminAccessTokens;
  createAdminAccessToken?: typeof createAdminAccessToken;
  revokeAdminAccessToken?: typeof revokeAdminAccessToken;
  getActiveAdminAccessToken?: typeof getActiveAdminAccessToken;
  listAdminTokenUsage?: typeof listAdminTokenUsage;
};

export async function listAdminAccessTokensHandler(
  req: Request,
  res: Response,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(req);

  if (!adminId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokens = await (deps.listAdminAccessTokens ?? listAdminAccessTokens)(adminId);
  return res.json({ ok: true, tokens });
}

export async function createAdminAccessTokenHandler(
  req: Request,
  res: Response,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(req);

  if (!adminId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const type = typeof req.body?.type === "string" ? req.body.type.trim() : "";
  const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";

  if (!type || !label) {
    return res.status(400).json({ message: "Preencha tipo e nome do token." });
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

  const created = await (deps.createAdminAccessToken ?? createAdminAccessToken)({
    adminId,
    type,
    label,
    permissions,
    expiresAt,
    description,
  });

  return res.status(201).json({
    ok: true,
    tokenId: created.id,
    token: created.plaintextToken,
    type,
    label,
  });
}

export async function revokeAdminAccessTokenHandler(
  req: Request,
  res: Response,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(req);

  if (!adminId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokenId = Array.isArray(req.params.tokenId)
    ? req.params.tokenId[0]
    : req.params.tokenId;

  if (!tokenId) {
    return res.status(400).json({ message: "Token nao informada." });
  }

  const revoked = await (deps.revokeAdminAccessToken ?? revokeAdminAccessToken)(
    adminId,
    tokenId,
  );

  if (!revoked) {
    return res.status(404).json({ message: "Token nao encontrada." });
  }

  return res.json({ ok: true, revoked: true, tokenId });
}

export async function getCurrentAdminCodexTokenStatus(
  req: Request,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(req);

  if (!adminId) {
    return null;
  }

  return (deps.getActiveAdminAccessToken ?? getActiveAdminAccessToken)(
    adminId,
    "codex",
  );
}

export async function getAdminTokenUsageHandler(
  req: Request,
  res: Response,
  deps: AdminAccessTokenDeps = {},
) {
  const adminId = getAdminId(req);

  if (!adminId) {
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

  const logs = await (deps.listAdminTokenUsage ?? listAdminTokenUsage)(adminId, tokenId, limit);
  return res.json({ ok: true, logs });
}
