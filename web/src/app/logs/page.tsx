import { LogsProjectPicker } from "@/components/logs/logs-project-picker";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogsProjectsPage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  if (user.role !== "admin") {
    return <ClientRedirect to="/painel" label="dashboard" />;
  }

  return (
    <AppShell
      user={user}
      eyebrow="Observabilidade"
      title="Projetos de logs"
      description="Escolha um projeto para abrir a visao detalhada dos logs."
      fullWidth
      lockViewport
    >
      <LogsProjectPicker />
    </AppShell>
  );
}
