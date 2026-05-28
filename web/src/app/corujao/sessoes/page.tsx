import { CorujaoSessoesLista } from "@/components/corujao/corujao-sessoes-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CorujaoSessoesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Corujão", href: "/corujao" }]}
      title="Sessões"
      description="Planeje as noites do Corujão e acompanhe vagas vendidas."
    >
      <CorujaoSessoesLista />
    </AppShell>
  );
}
