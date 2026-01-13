import { apiFetch } from "./api";

export async function login(password: string) {
  const basicUser = import.meta.env.VITE_BASIC_USER;
  const basicPass = import.meta.env.VITE_BASIC_PASS;

  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  localStorage.setItem("token", data.token);
  return data;
}
