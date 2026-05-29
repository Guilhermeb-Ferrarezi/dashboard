import { MixSessoesLista } from "@/components/mix/mix-sessoes-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MixSessoesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Mix", href: "/mix/sessoes" }]}
      title="Sessões de Mix"
      description="Gerencie os mixes em aberto — jogos, datas e vagas."
    >
      <MixSessoesLista />
    </AppShell>
  );
}
