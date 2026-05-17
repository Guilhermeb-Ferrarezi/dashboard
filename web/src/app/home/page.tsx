import { AppShell } from "@/components/portal/app-shell";
import { PortalDashboard } from "@/components/portal/portal-dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadDashboardSummary } from "@/lib/dashboard";
import { requireSession } from "@/lib/session";
import { loadPortalProjects } from "@/lib/portal-projects";
import { cookies } from "next/headers";
import type { PortalProject } from "@/types/portal";
import type { DashboardSummary } from "@/types/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireSession();
  const cookieHeader = (await cookies()).toString();

  let projectsLoadFailed = false;
  let summaryLoadFailed = false;
  let projects: PortalProject[] = [];
  let summary: DashboardSummary | null = null;

  const [projectsResult, summaryResult] = await Promise.allSettled([
    loadPortalProjects(),
    user.role === "admin" ? loadDashboardSummary(cookieHeader) : Promise.resolve(null),
  ]);

  if (projectsResult.status === "fulfilled") {
    projects = projectsResult.value;
  } else {
    projectsLoadFailed = true;
    console.error("Falha ao carregar projetos no /home.", projectsResult.reason);
  }

  if (summaryResult.status === "fulfilled" && summaryResult.value) {
    summary = summaryResult.value.summary;
  } else {
    if (user.role === "admin") {
      summaryLoadFailed = true;
      if (summaryResult.status === "rejected") {
        console.error("Falha ao carregar resumo do dashboard no /home.", summaryResult.reason);
      }
    }
  }

  return (
    <AppShell
      user={user}
      eyebrow="Universal Home"
      title="Dashboard operacional"
      description="Visao geral do portal, status da base e atalhos para as areas principais."
    >
      {projectsLoadFailed ? (
        <Alert variant="destructive" className="mb-6 border-border/60 bg-card/80">
          <AlertTitle>Base indisponivel</AlertTitle>
          <AlertDescription>
            Os indicadores do dashboard dependem da lista de projetos e nao
            carregaram agora. A pagina continua aberta para manter a navegacao
            e voce pode tentar novamente em instantes.
          </AlertDescription>
        </Alert>
      ) : null}
      {summaryLoadFailed && user.role === "admin" ? (
        <Alert variant="destructive" className="mb-6 border-border/60 bg-card/80">
          <AlertTitle>Resumo indisponivel</AlertTitle>
          <AlertDescription>
            Nao foi possivel carregar as metricas reais da API agora. A pagina
            continua aberta para manter a navegacao.
          </AlertDescription>
        </Alert>
      ) : null}
      <PortalDashboard user={user} projects={projects} summary={summary} />
    </AppShell>
  );
}
