import { ProjectLogsView } from "@/components/logs/project-logs-view";
import { AppShell } from "@/components/portal/app-shell";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectLogsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireSession();
  const { projectId } = await params;

  return (
    <AppShell
      user={user}
      eyebrow="Observabilidade"
      title="Central de logs"
      description="Monitore eventos, filtre endpoints e navegue entre paginas de logs."
      fullWidth
      lockViewport
    >
      <ProjectLogsView projectId={projectId} />
    </AppShell>
  );
}
