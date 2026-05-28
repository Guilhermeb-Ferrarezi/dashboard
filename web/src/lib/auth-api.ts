export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "https://auth.santos-games.com";

export const AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_AUTH_CLIENT_ID || "painel-adm";

export const AUTH_REFRESH_URL = `${AUTH_API_URL}/api/auth/refresh`;
export const AUTH_LOGOUT_URL = `${AUTH_API_URL}/api/auth/logout`;
export const AUTH_SESSIONS_URL = `${AUTH_API_URL}/api/auth/sessions`;

export function getAuthLoginUrl(returnTo?: string) {
  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL || "https://painel-adm.santos-games.com/auth/callback";

  const params = new URLSearchParams({
    client_id: AUTH_CLIENT_ID,
    redirect_uri: callbackUrl,
  });

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  return `${AUTH_API_URL}?${params}`;
}

let pendingRefresh: Promise<boolean> | null = null;

/**
 * Tenta renovar a sessão chamando POST /api/auth/refresh no auth-api.
 * Várias chamadas concorrentes são deduplicadas em um único request.
 * Retorna true se renovou, false caso contrário.
 */
export function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = fetch(AUTH_REFRESH_URL, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
}
