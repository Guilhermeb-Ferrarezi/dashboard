import { AppShell } from "@/components/portal/app-shell";
import { PortalDashboard } from "@/components/portal/portal-dashboard";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadDashboardSummary } from "@/lib/dashboard";
import { getSessionUser } from "@/lib/session";
import { loadPortalProjects } from "@/lib/portal-projects";
import { cookies } from "next/headers";
import type { PortalProject } from "@/types/portal";
import type { DashboardSummary } from "@/types/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardOpsPage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

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
  }

  if (summaryResult.status === "fulfilled" && summaryResult.value) {
    summary = summaryResult.value.summary;
  } else {
    if (user.role === "admin") {
      summaryLoadFailed = true;
    }
  }

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Plataforma", href: "/painel/ops" }]}
      title="Dashboard Ops"
      description="Métricas de infraestrutura e tráfego da API."
    >
      {projectsLoadFailed ? (
        <Alert variant="destructive" className="mb-6 border-border/60 bg-card/80">
          <AlertTitle>Base indisponível</AlertTitle>
          <AlertDescription>
            Os indicadores dependem da lista de projetos e não carregaram agora.
          </AlertDescription>
        </Alert>
      ) : null}
      {summaryLoadFailed && user.role === "admin" ? (
        <Alert variant="destructive" className="mb-6 border-border/60 bg-card/80">
          <AlertTitle>Resumo indisponível</AlertTitle>
          <AlertDescription>
            Não foi possível carregar as métricas reais da API agora.
          </AlertDescription>
        </Alert>
      ) : null}
      <PortalDashboard user={user} projects={projects} summary={summary} />
    </AppShell>
  );
}
