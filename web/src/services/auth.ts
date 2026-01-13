import { apiFetch } from "./api";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: string;
  username: string;
  role: "user" | "admin";
  exp: number;
}

/* =====================
   LOGIN
===================== */
export async function login(username: string, password: string) {
  const basicUser = import.meta.env.VITE_BASIC_USER;
  const basicPass = import.meta.env.VITE_BASIC_PASS;

  if (!basicUser || !basicPass) {
    throw new Error("Basic Auth não configurado");
  }

  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  localStorage.setItem("token", data.token);
  return data;
}

/* =====================
   HELPERS
===================== */
export function getToken() {
  return localStorage.getItem("token");
}

export function getUserFromToken(): DecodedToken | null {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

export function getUserRole() {
  return getUserFromToken()?.role ?? null;
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("token");
}
