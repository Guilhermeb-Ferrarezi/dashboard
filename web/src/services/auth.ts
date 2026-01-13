import { apiFetch } from "./api";

interface LoginData {
  email: string;
  password: string;
}

export async function login({ email, password }: LoginData) {
  const basicUser = import.meta.env.VITE_BASIC_USER;
  const basicPass = import.meta.env.VITE_BASIC_PASS;

  if (!basicUser || !basicPass) {
    throw new Error("Credenciais Basic Auth não configuradas");
  }

  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const data = await apiFetch("/auth/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("token", data.token);
  return data;
}
