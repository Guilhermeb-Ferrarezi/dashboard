import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { SocialLista } from "@/components/social/social-lista";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SocialListaPage() {
  const user = await getSessionUser();
  if (!user) return <ClientRedirect to="/login" label="login" />;

  return (
    <AppShell
      user={user}
      eyebrow="Social"
      title="Lista"
      description="Todos os posts com filtros por plataforma, pilar e status."
    >
      <SocialLista />
    </AppShell>
  );
}
