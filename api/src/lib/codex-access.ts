import { listUserAccessTokens } from "./user-access-token";

export type CodexAccessState = {
  codexAccessTokenActive: boolean;
  codexAccessTokenRequired: boolean;
  codexAccessBlockedReason: string | null;
  activeToken: null;
};

export async function resolveCodexAccessState(
  adminId: string | null | undefined,
): Promise<CodexAccessState> {
  if (!adminId) {
    return {
      codexAccessTokenActive: false,
      codexAccessTokenRequired: false,
      codexAccessBlockedReason: null,
      activeToken: null,
    };
  }

  const codexTokens = await listUserAccessTokens(adminId, "codex");

  return {
    codexAccessTokenActive: codexTokens.length > 0,
    codexAccessTokenRequired: false,
    codexAccessBlockedReason: codexTokens.length
      ? null
      : "Crie um token Codex em Configuracoes do usuario > Acesso Codex.",
    activeToken: null,
  };
}
