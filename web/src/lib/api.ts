import { API_BASE_URL } from "@/lib/env";

type ApiFetchOptions = RequestInit & {
  cookieHeader?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "Request failed.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function clientApi<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  return parseApiResponse<T>(response);
}

export async function serverApi<T>(
  endpoint: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  if (init.cookieHeader) {
    headers.set("Cookie", init.cookieHeader);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  return parseApiResponse<T>(response);
}
