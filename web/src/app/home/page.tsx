import { AppShell } from "@/components/portal/app-shell";
import { ProjectLauncher } from "@/components/portal/project-launcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { serverApi } from "@/lib/api-server";
import { requireSession } from "@/lib/session";
import type { PortalProject } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireSession();

  let projects: PortalProject[] = [];
  let projectsLoadFailed = false;

  try {
    const projectResponse = await serverApi<{ projects: PortalProject[] }>("/projects");
    projects = projectResponse.projects;
  } catch (error) {
    projectsLoadFailed = true;
    console.error("Falha ao carregar projetos no /home.", error);
  }

  return (
    <AppShell
      user={user}
      eyebrow="Universal Home"
      title="Launcher de projetos"
      description="Uma entrada unica para portal, admin e outras operacoes."
    >
      {projectsLoadFailed ? (
        <Alert variant="destructive" className="mb-6 border-border/60 bg-card/80">
          <AlertTitle>Projetos indisponiveis</AlertTitle>
          <AlertDescription>
            A lista de projetos nao carregou agora. A pagina continua aberta para
            manter a navegacao e voce pode tentar novamente em instantes.
          </AlertDescription>
        </Alert>
      ) : null}
      <ProjectLauncher user={user} projects={projects} />
    </AppShell>
  );
}
