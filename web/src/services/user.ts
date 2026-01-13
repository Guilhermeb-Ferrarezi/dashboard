import { apiFetch } from "./api";
import { getToken } from "./auth";

export async function getUserData() {
  const token = getToken();
  if (!token) throw new Error("Não autenticado");

  return apiFetch("/user/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
