import { apiFetch } from "./api";

export async function register(
  username: string,
  password: string
) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}
