export type ApiFetchOptions = RequestInit & {
  cookieHeader?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      const { getAuthLoginUrl } = await import("@/lib/auth-api");
      window.location.href = getAuthLoginUrl();
      throw new ApiError("Sessão expirada", 401);
    }

    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "Request failed.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

