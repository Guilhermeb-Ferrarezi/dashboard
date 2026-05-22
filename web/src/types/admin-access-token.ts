export interface AdminAccessTokenSummary {
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
}
