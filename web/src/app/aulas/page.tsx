import { AulasCalendario } from "@/components/aulas/aulas-calendario";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AulasPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Aulas", href: "/aulas" }]}
      title="Calendário de aulas"
      description="Turmas recorrentes, aulas avulsas e exceções — migrado da Agenda de Aulas do Notion."
      lockViewport
    >
      <AulasCalendario />
    </AppShell>
  );
}
