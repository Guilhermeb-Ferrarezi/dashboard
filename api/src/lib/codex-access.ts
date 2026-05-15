import { resolveCodexServiceToken } from "./codex-service-token";

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

  return {
    codexAccessTokenActive: Boolean(resolveCodexServiceToken()),
    codexAccessTokenRequired: false,
    codexAccessBlockedReason: null,
    activeToken: null,
  };
}
