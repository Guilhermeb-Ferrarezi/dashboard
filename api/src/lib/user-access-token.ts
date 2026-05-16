import crypto from "node:crypto";

import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { encryptSecret } from "./token-vault";

export type UserAccessTokenType = "account" | "codex";

export type UserAccessTokenSummary = {
  id: string;
  userId: string;
  type: UserAccessTokenType;
  label: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeAccessToken(token: {
  _id: unknown;
  userId: string;
  type?: UserAccessTokenType | null;
  label: string;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): UserAccessTokenSummary {
  return {
    id: String(token._id),
    userId: token.userId,
    type: token.type ?? "account",
    label: token.label,
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

export async function revokeUserAccessToken(userId: string, tokenId: string) {
  const result = await UserAccessToken.updateOne(
    { _id: tokenId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return Boolean(result.modifiedCount);
}

export async function authenticateUserAccessToken(plaintextToken: string) {
  const tokenHash = hashUserAccessToken(plaintextToken);
  const token = await UserAccessToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    {
      $set: {
        lastUsedAt: new Date(),
        encryptedToken: encryptSecret(plaintextToken),
      },
    },
    { new: true },
  ).lean();

  if (!token) {
    return null;
  }

  const user = await User.findById(token.userId)
    .select("_id username email role")
    .lean();

  if (!user) {
    return null;
  }

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
