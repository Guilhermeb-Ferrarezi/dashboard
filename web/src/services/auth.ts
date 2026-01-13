import { apiFetch } from "./api";
import {jwtDecode} from "jwt-decode";

interface DecodedToken {
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
    body: JSON.stringify({ username, password }),
  });

  localStorage.setItem("token", data.token);
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

/* TOKEN & USUÁRIO */
export function getToken() { return localStorage.getItem("token"); }
export function logout() { localStorage.removeItem("token"); }
export function getUserFromToken(): DecodedToken | null {
  const token = getToken();
  if (!token) return null;
  try { return jwtDecode<DecodedToken>(token); } catch { return null; }
}
export function getUserRole() { return getUserFromToken()?.role ?? null; }
export function isAuthenticated() { return !!getToken(); }

/* ROTAS PROTEGIDAS */
export async function getUserArea() {
  const token = getToken(); if (!token) throw new Error("Missing token");
  const res = await fetch(`${import.meta.env.VITE_API_URL}/user`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAdminArea() {
  const token = getToken(); if (!token) throw new Error("Missing token");
  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
