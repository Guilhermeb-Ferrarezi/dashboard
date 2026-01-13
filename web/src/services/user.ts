import { apiFetch } from "./api";

export async function getUserData() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Usuário não autenticado");
  }

  return apiFetch("/user/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
