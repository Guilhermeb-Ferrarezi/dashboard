import { ClientRedirect } from "@/components/navigation/client-redirect";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const user = await getSessionUser();

  if (user && user.role === "admin") {
    return <ClientRedirect to="/home" label="dashboard" />;
  }

  return <ClientRedirect to="/login" label="login" />;
}
