export interface AdminAccessTokenSummary {
  id: string;
  adminId: string;
  type: string;
  label: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
