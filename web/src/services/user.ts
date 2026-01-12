// src/services/user.ts
export async function getUserData() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");

  const response = await fetch("/api/user/me", {
    headers: {
      "Authorization": `Bearer ${token}`, // JWT
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao buscar dados do usuário");
  }

  return response.json();
}
