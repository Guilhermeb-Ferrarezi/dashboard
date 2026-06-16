import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { SocialCalendario } from "@/components/social/social-calendario";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SocialCalendarioPage() {
  const user = await getSessionUser();
  if (!user) return <ClientRedirect to="/login" label="login" />;

  return (
    <AppShell
      user={user}
      eyebrow="Social"
      title="Calendário"
      description="Calendário mensal de posts por data."
    >
      <SocialCalendario />
    </AppShell>
  );
}
