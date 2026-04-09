import { AppShell } from "@/components/portal/app-shell";
import { ProjectLauncher } from "@/components/portal/project-launcher";
import { serverApi } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { PortalProject } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, projectResponse] = await Promise.all([
    requireSession(),
    serverApi<{ projects: PortalProject[] }>("/projects"),
  ]);

  return (
    <AppShell
      user={user}
      eyebrow="Universal Home"
      title="Launcher de projetos"
      description="Uma entrada unica para portal, admin, zap e outras operacoes."
    >
      <ProjectLauncher user={user} projects={projectResponse.projects} />
    </AppShell>
  );
}
