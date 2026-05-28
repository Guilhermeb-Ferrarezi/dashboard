import type { AdminAccessTokenSummary } from "../lib/admin-access-token";

export interface AuthUserPayload {
  id: string;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  exp?: number;
  iat?: number;
  authType?: "session" | "token" | "service";
  tokenPermissions?: string[];
}

export type Variables = {
  user: AuthUserPayload;
  codexAccessToken: AdminAccessTokenSummary;
};

export type AppEnv = { Variables: Variables };
