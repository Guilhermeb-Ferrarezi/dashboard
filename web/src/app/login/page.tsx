import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";
import { getAuthLoginUrl } from "@/lib/auth-api";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/home");
  }

  redirect(getAuthLoginUrl());
}
