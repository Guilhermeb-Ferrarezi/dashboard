import crypto from "node:crypto";

import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { TokenUsageLog } from "../models/TokenUsageLog";
import { decryptSecret, encryptSecret } from "./token-vault";
import { validatePermissions } from "./token-permissions";

export type UserAccessTokenType = "account" | "codex";

export type UserAccessTokenSummary = {
  id: string;
  userId: string;
  type: UserAccessTokenType;
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
  userId: string;
  type?: UserAccessTokenType | null;
  label: string;
  permissions?: string[] | null;
  expiresAt?: Date | null;
  description?: string | null;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): UserAccessTokenSummary {
  const { isExpiringSoon, isExpired } = computeExpiryFlags(token.expiresAt ?? null);
  return {
    id: String(token._id),
    userId: token.userId,
    type: token.type ?? "account",
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

export function createUserAccessTokenValue() {
  return `uat_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashUserAccessToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeUserAccessTokenType(value?: string | null): UserAccessTokenType {
  return value === "codex" ? "codex" : "account";
}

export async function createUserAccessToken(params: {
  userId: string;
  label: string;
  type?: UserAccessTokenType;
  permissions?: string[];
  expiresAt?: Date | null;
  description?: string;
}) {
  const type = normalizeUserAccessTokenType(params.type);
  const plaintextToken = createUserAccessTokenValue();
  const tokenHash = hashUserAccessToken(plaintextToken);
  const encryptedToken = encryptSecret(plaintextToken);

  if (type === "codex") {
    await UserAccessToken.updateMany(
      { userId: params.userId, type, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  const created = await UserAccessToken.create({
    userId: params.userId,
    type,
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

export async function listUserAccessTokens(userId: string, type?: UserAccessTokenType) {
  const filter: Record<string, unknown> = { userId };

  if (type) {
    if (type === "account") {
      filter.$or = [{ type: "account" }, { type: { $exists: false } }];
    } else {
      filter.type = "codex";
    }
  }

  const tokens = await UserAccessToken.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return tokens.map(serializeAccessToken);
}

export async function resolveActiveUserAccessTokenValue(
  userId: string,
  type: UserAccessTokenType,
) {
  const token = await UserAccessToken.findOne({
    userId,
    type,
    revokedAt: null,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("+encryptedToken")
    .lean();

  if (!token?.encryptedToken) {
    return null;
  }

  try {
    return decryptSecret(token.encryptedToken);
  } catch {
    return null;
  }
}

export async function revokeUserAccessToken(userId: string, tokenId: string) {
  const result = await UserAccessToken.updateOne(
    { _id: tokenId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return Boolean(result.modifiedCount);
}

export async function authenticateUserAccessToken(plaintextToken: string) {
  const tokenHash = hashUserAccessToken(plaintextToken);
  const token = await UserAccessToken.findOne({ tokenHash, revokedAt: null }).lean();

  if (!token) return null;

  if (token.expiresAt && token.expiresAt < new Date()) return null;

  await UserAccessToken.updateOne(
    { _id: token._id },
    { $set: { lastUsedAt: new Date(), encryptedToken: encryptSecret(plaintextToken) } },
  );

  const user = await User.findById(token.userId)
    .select("_id username email role")
    .lean();

  if (!user) return null;

  return {
    token: serializeAccessToken(token),
    user: {
      id: String(user._id),
      username: user.username,
      email: user.email ?? null,
      role: user.role,
    },
  };
}

export async function logUserTokenUsage(params: {
  tokenId: string;
  tokenHash: string;
  userId: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
}) {
  try {
    await TokenUsageLog.create({
      tokenId: params.tokenId,
      tokenHash: params.tokenHash,
      ownerType: "user",
      ownerId: params.userId,
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

export async function listUserTokenUsage(userId: string, tokenId: string, limit = 20) {
  const logs = await TokenUsageLog.find({ tokenId, ownerType: "user", ownerId: userId })
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
