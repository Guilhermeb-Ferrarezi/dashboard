import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { serverApi } from "@/lib/api";
import type { ThemePreferences } from "@/lib/theme-preferences";

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  preferences: ThemePreferences;
  exp?: number;
}

interface MeResponse {
  user: SessionUser;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const data = await serverApi<MeResponse>("/user/me", { cookieHeader });
    return data.user;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminSession() {
  const user = await requireSession();

  if (user.role !== "admin") {
    redirect("/home");
  }

  return user;
}
