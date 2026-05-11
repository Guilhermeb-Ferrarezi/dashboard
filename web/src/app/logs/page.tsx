import { LogsProjectPicker } from "@/components/logs/logs-project-picker";
import { AppShell } from "@/components/portal/app-shell";
import { requireAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogsProjectsPage() {
  const user = await requireAdminSession();

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
