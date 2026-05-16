import type { Request, Response } from "express";

import {
  createUserAccessToken,
  listUserAccessTokens,
  revokeUserAccessToken,
} from "../lib/user-access-token";

function getUserId(req: Request) {
  return req.user?.id;
}

type UserAccessTokenDeps = {
  listUserAccessTokens?: typeof listUserAccessTokens;
  createUserAccessToken?: typeof createUserAccessToken;
  revokeUserAccessToken?: typeof revokeUserAccessToken;
};

export async function listUserAccessTokensHandler(
  req: Request,
  res: Response,
  deps: UserAccessTokenDeps = {},
) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const tokens = await (deps.listUserAccessTokens ?? listUserAccessTokens)(userId);
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

  const created = await (deps.createUserAccessToken ?? createUserAccessToken)({
    userId,
    label,
  });

  return res.status(201).json({
    ok: true,
    tokenId: created.id,
    token: created.plaintextToken,
    label,
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
