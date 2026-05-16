export type UserAccessTokenType = "account" | "codex";

export interface UserAccessTokenSummary {
  id: string;
  userId: string;
  type: UserAccessTokenType;
  label: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
