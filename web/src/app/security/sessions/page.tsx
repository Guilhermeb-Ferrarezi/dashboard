import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { SessionsPanel } from "@/components/security/sessions-panel";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  return (
    <AppShell
      user={user}
      eyebrow="Segurança"
      title="Minhas sessões"
      description="Dispositivos com acesso à sua conta. Desconecte qualquer um que você não reconheça."
    >
      <SessionsPanel />
    </AppShell>
  );
}
