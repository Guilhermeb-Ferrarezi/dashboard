import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/home");
  }

  return <LoginForm />;
}
