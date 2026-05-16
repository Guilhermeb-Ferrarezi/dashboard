import crypto from "node:crypto";

import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { encryptSecret } from "./token-vault";

export type UserAccessTokenSummary = {
  id: string;
  userId: string;
  label: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeAccessToken(token: {
  _id: unknown;
  userId: string;
  label: string;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): UserAccessTokenSummary {
  return {
    id: String(token._id),
    userId: token.userId,
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

export async function createUserAccessToken(params: { userId: string; label: string }) {
  const plaintextToken = createUserAccessTokenValue();
  const tokenHash = hashUserAccessToken(plaintextToken);
  const encryptedToken = encryptSecret(plaintextToken);

  const created = await UserAccessToken.create({
    userId: params.userId,
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

export async function listUserAccessTokens(userId: string) {
  const tokens = await UserAccessToken.find({ userId })
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
