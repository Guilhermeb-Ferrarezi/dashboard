import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();

  if (user) {
    redirect("/home");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return <LoginForm error={resolvedSearchParams?.error} />;
}
