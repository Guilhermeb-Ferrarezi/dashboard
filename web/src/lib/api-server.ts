import { headers } from "next/headers";

import { ApiError, parseApiResponse, type ApiFetchOptions } from "@/lib/api-core";

function resolveServerApiBaseUrl(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
) {
  const serverApiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL;

  if (serverApiUrl) {
    return serverApiUrl.replace(/\/$/, "");
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.replace(/\/$/, "")}/api`;
  }

  return "http://127.0.0.1:4000/api";
}

export { ApiError };

export async function serverApi<T>(
  endpoint: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const requestHeaders = await headers();
  const headersInit = new Headers(init.headers);

  if (!headersInit.has("Content-Type") && init.method && init.method !== "GET") {
    headersInit.set("Content-Type", "application/json");
  }

  if (init.cookieHeader) {
    headersInit.set("Cookie", init.cookieHeader);
  }

  const response = await fetch(
    `${resolveServerApiBaseUrl(requestHeaders)}${endpoint}`,
    {
    ...init,
    headers: headersInit,
    cache: init.cache ?? "no-store",
  },
  );

  return parseApiResponse<T>(response);
}
