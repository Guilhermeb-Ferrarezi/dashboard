import { AppShell } from "@/components/portal/app-shell";
import { ProjectLauncher } from "@/components/portal/project-launcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireSession } from "@/lib/session";
import { loadPortalProjects } from "@/lib/portal-projects";
import type { PortalProject } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireSession();

  let projectsLoadFailed = false;
  let projects: PortalProject[] = [];

  try {
    projects = await loadPortalProjects();
  } catch (error) {
    projectsLoadFailed = true;
    console.error("Falha ao carregar projetos no /projects.", error);
  }

  return (
    <AppShell
      user={user}
      eyebrow="Catálogo"
      title="Projetos"
      description="Entrada dedicada para abrir, favoritar e filtrar os apps internos."
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
