export const CODEX_ACCESS_TOKEN_COOKIE = "codex_access_token";

export function setCodexAccessTokenCookie(token: string) {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge = 60 * 60 * 24 * 365;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CODEX_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearCodexAccessTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CODEX_ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
