export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "https://auth.santos-games.com";

export const AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_AUTH_CLIENT_ID || "painel-adm";

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
