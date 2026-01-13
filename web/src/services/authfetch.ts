// services/authfetch.ts
import { API_URL } from "./api";

export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  if (!token) throw new Error("Usuário não autenticado");

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const contentType = res.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Resposta não é JSON: ${text}`);
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Erro na requisição");
  }

  return res.json();
}
