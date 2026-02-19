export const API_URL = import.meta.env.VITE_API_URL; // ex: http://localhost:4000

export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include", // Sempre envia e recebe cookies
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Resposta não é JSON: ${text}`);
  }

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Erro na requisição");
  }

  return response.json();
}
