import {
  getActiveAdminAccessToken,
  type AdminAccessTokenSummary,
} from "./admin-access-token";

export type CodexAccessState = {
  codexAccessTokenActive: boolean;
  codexAccessTokenRequired: boolean;
  codexAccessBlockedReason: string | null;
  activeToken: AdminAccessTokenSummary | null;
};

export const CODEX_ACCESS_BLOCKED_REASON =
  "Crie um token de acesso do Codex nas configuracoes do admin.";

export async function resolveCodexAccessState(
  adminId: string | null | undefined,
  fetchActiveToken: typeof getActiveAdminAccessToken = getActiveAdminAccessToken,
): Promise<CodexAccessState> {
  if (!adminId) {
    return {
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason: CODEX_ACCESS_BLOCKED_REASON,
      activeToken: null,
    };
  }

  const activeToken = await fetchActiveToken(adminId, "codex");

  if (!activeToken) {
    return {
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason: CODEX_ACCESS_BLOCKED_REASON,
      activeToken: null,
    };
  }

  return {
    codexAccessTokenActive: true,
    codexAccessTokenRequired: true,
    codexAccessBlockedReason: null,
    activeToken,
  };
}
