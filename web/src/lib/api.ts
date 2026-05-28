import { parseApiResponse } from "@/lib/api-core";
import { getAuthLoginUrl, refreshSession } from "@/lib/auth-api";

const DEFAULT_CLIENT_API_BASE_URL = "/api";

export function getClientApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  return (apiUrl?.replace(/\/$/, "") || DEFAULT_CLIENT_API_BASE_URL);
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 401 || typeof window === "undefined") {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    window.location.href = getAuthLoginUrl();
    return response;
  }

  return fetch(url, init);
}

export async function clientApi<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchWithAuth(
    `${getClientApiBaseUrl()}${endpoint}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      credentials: "include",
    },
  );

  return parseApiResponse<T>(response);
}
