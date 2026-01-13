export const API_URL = import.meta.env.VITE_API_URL;

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Resposta não é JSON: ${text}`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erro na requisição");
  }

  return data;
}
