export type UserAccessTokenType = "account" | "codex";

export interface UserAccessTokenSummary {
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
}

export interface TokenUsageEntry {
  id: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  usedAt: string;
}
