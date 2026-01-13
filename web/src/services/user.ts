export async function getUserData() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Não autenticado");

  const res = await fetch("/api/user/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}
