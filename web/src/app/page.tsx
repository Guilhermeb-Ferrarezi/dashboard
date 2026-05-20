import { ClientRedirect } from "@/components/navigation/client-redirect";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const user = await getSessionUser();

  if (user) {
    return <ClientRedirect to="/home" label="dashboard" />;
  }

  return <LoginForm />;
}
