import { apiFetch } from "./api";
interface AuthUser {
  id: string;
  username: string;
  role: "user" | "admin";
  exp: number;
}

/* LOGIN */
export async function login(username: string, password: string) {
  const basicUser = import.meta.env.VITE_BASIC_USER;
  const basicPass = import.meta.env.VITE_BASIC_PASS;
  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const data = await apiFetch("/auth/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    credentials: "include", // Permite receber e enviar cookies
    body: JSON.stringify({ username, password }),
  });

  return data;
}

/* CRIAR CONTA */
export async function register(username: string, password: string, role: "user" | "admin" = "user") {
  const basicUser = import.meta.env.VITE_BASIC_USER;
  const basicPass = import.meta.env.VITE_BASIC_PASS;
  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const data = await apiFetch("/auth/register", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, role }),
  });

  return data;
}

/* LOGOUT */
export async function logout() {
  try {
    // Chama o endpoint de logout para limpar o cookie no servidor
    await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include" // Importante para enviar o cookie
    });
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
}

/* VERIFICAR AUTENTICAÇÃO VIA COOKIE */
export async function checkAuth() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/user/me`, {
      credentials: "include" // Envia cookie automaticamente
    });

    if (res.ok) {
      const data = await res.json();
      return data.user as AuthUser;
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    return null;
  }
}

/* ROTAS PROTEGIDAS */
export async function getUserArea() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/user`, {
    credentials: "include", // Envia cookies
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAdminArea() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin`, {
    credentials: "include", // Envia cookies
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
