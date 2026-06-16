import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { SocialResumo } from "@/components/social/social-resumo";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SocialResumoPage() {
  const user = await getSessionUser();
  if (!user) return <ClientRedirect to="/login" label="login" />;

  return (
    <AppShell
      user={user}
      eyebrow="Social"
      title="Resumo"
      description="Visão geral do calendário editorial — junho 2026."
    >
      <SocialResumo />
    </AppShell>
  );
}
