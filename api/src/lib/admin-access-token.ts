import crypto from "node:crypto";

import { AdminAccessToken } from "../models/AdminAccessToken";
import { TokenUsageLog } from "../models/TokenUsageLog";
import { encryptSecret, decryptSecret } from "./token-vault";
import { validatePermissions } from "./token-permissions";

export type AdminAccessTokenSummary = {
  id: string;
  adminId: string;
  type: string;
  label: string;
  permissions: string[];
  expiresAt: string | null;
  description: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const EXPIRING_SOON_MS = 7 * 24 * 3600 * 1000;

function computeExpiryFlags(expiresAt: Date | null | undefined) {
  if (!expiresAt) return { isExpiringSoon: false, isExpired: false };
  const now = Date.now();
  const exp = expiresAt.getTime();
  return {
    isExpired: exp < now,
    isExpiringSoon: exp >= now && exp - now < EXPIRING_SOON_MS,
  };
}

function serializeAccessToken(token: {
  _id: unknown;
  adminId: string;
  type: string;
  label: string;
  permissions?: string[] | null;
  expiresAt?: Date | null;
  description?: string | null;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): AdminAccessTokenSummary {
  const { isExpiringSoon, isExpired } = computeExpiryFlags(token.expiresAt ?? null);
  return {
    id: String(token._id),
    adminId: token.adminId,
    type: token.type,
    label: token.label,
    permissions: token.permissions ?? [],
    expiresAt: token.expiresAt?.toISOString() ?? null,
    description: token.description ?? "",
    isExpiringSoon,
    isExpired,
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
  permissions?: string[];
  expiresAt?: Date | null;
  description?: string;
}) {
  const plaintextToken = createAdminAccessTokenValue();
  const tokenHash = hashAdminAccessToken(plaintextToken);
  const encryptedToken = encryptSecret(plaintextToken);

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
    encryptedToken,
    permissions: params.permissions ?? [],
    expiresAt: params.expiresAt ?? null,
    description: params.description ?? "",
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

export async function getActiveAdminAccessTokenSecret(adminId: string, type: string) {
  const token = await AdminAccessToken.findOne({ adminId, type, revokedAt: null })
    .select("+encryptedToken")
    .lean();

  if (!token?.encryptedToken) {
    return null;
  }

  return decryptSecret(token.encryptedToken);
}

export async function authenticateAdminAccessToken(
  adminId: string,
  type: string,
  plaintextToken: string,
) {
  const tokenHash = hashAdminAccessToken(plaintextToken);
  const token = await AdminAccessToken.findOne(
    { adminId, type, revokedAt: null, tokenHash },
  ).lean();

  if (!token) return null;

  if (token.expiresAt && token.expiresAt < new Date()) return null;

  await AdminAccessToken.updateOne(
    { _id: token._id },
    { $set: { lastUsedAt: new Date(), encryptedToken: encryptSecret(plaintextToken) } },
  );

  return serializeAccessToken(token);
}

export async function logAdminTokenUsage(params: {
  tokenId: string;
  tokenHash: string;
  adminId: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
}) {
  try {
    await TokenUsageLog.create({
      tokenId: params.tokenId,
      tokenHash: params.tokenHash,
      ownerType: "admin",
      ownerId: params.adminId,
      method: params.method,
      path: params.path,
      ip: params.ip,
      userAgent: params.userAgent,
      usedAt: new Date(),
    });
  } catch {
    // fire-and-forget
  }
}

export async function listAdminTokenUsage(adminId: string, tokenId: string, limit = 20) {
  const logs = await TokenUsageLog.find({ tokenId, ownerType: "admin", ownerId: adminId })
    .sort({ usedAt: -1 })
    .limit(limit)
    .lean();

  return logs.map((l) => ({
    id: String(l._id),
    method: l.method,
    path: l.path,
    ip: l.ip,
    userAgent: l.userAgent,
    usedAt: l.usedAt.toISOString(),
  }));
}

export { validatePermissions };
