import { AppShell } from "@/components/portal/app-shell";
import { HomeWelcome } from "@/components/portal/home-welcome";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  return (
    <AppShell
      user={user}
      title="Home"
      description=""
    >
      <HomeWelcome username={user.username} />
    </AppShell>
  );
}
