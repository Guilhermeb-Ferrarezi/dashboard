import crypto from "node:crypto";

import { AdminAccessToken } from "../models/AdminAccessToken";

export type AdminAccessTokenSummary = {
  id: string;
  adminId: string;
  type: string;
  label: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeAccessToken(token: {
  _id: unknown;
  adminId: string;
  type: string;
  label: string;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): AdminAccessTokenSummary {
  return {
    id: String(token._id),
    adminId: token.adminId,
    type: token.type,
    label: token.label,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    createdAt: token.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: token.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

export function createAdminAccessTokenValue() {
  return `at_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashAdminAccessToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminAccessToken(params: {
  adminId: string;
  type: string;
  label: string;
}) {
  const plaintextToken = createAdminAccessTokenValue();
  const tokenHash = hashAdminAccessToken(plaintextToken);

  if (params.type === "codex") {
    await AdminAccessToken.updateMany(
      { adminId: params.adminId, type: params.type, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  const created = await AdminAccessToken.create({
    adminId: params.adminId,
    type: params.type,
    label: params.label,
    tokenHash,
    revokedAt: null,
    lastUsedAt: null,
  });

  return {
    id: String(created._id),
    plaintextToken,
  };
}

export async function listAdminAccessTokens(adminId: string) {
  const tokens = await AdminAccessToken.find({ adminId })
    .sort({ createdAt: -1 })
    .lean();

  return tokens.map(serializeAccessToken);
}

export async function revokeAdminAccessToken(adminId: string, tokenId: string) {
  const result = await AdminAccessToken.updateOne(
    { _id: tokenId, adminId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return Boolean(result.modifiedCount);
}

export async function getActiveAdminAccessToken(adminId: string, type: string) {
  const token = await AdminAccessToken.findOne({ adminId, type, revokedAt: null }).lean();

  if (!token) {
    return null;
  }

  return serializeAccessToken(token);
}
