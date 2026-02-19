import { apiFetch } from "./api";

export async function getUserData() {
  return apiFetch("/user/me");
}
