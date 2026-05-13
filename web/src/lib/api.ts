import { parseApiResponse } from "@/lib/api-core";

const DEFAULT_CLIENT_API_BASE_URL = "/api";

export function getClientApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  return (apiUrl?.replace(/\/$/, "") || DEFAULT_CLIENT_API_BASE_URL);
}

export async function clientApi<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
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
