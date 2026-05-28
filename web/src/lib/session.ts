import { cookies } from "next/headers";

import { serverApi } from "@/lib/api-server";
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

export async function requireSession(): Promise<SessionUser> {
  const { redirect } = await import("next/navigation");
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/login?denied=1");
  }

  return user;
}
