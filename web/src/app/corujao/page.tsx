import { CorujaoTrabalhoTabela } from "@/components/corujao/corujao-trabalho-tabela";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CorujaoTrabalhoPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Corujão", href: "/corujao" }]}
      title="Tela de trabalho"
      description="Lista priorizada pra encher o próximo Corujão."
    >
      <CorujaoTrabalhoTabela />
    </AppShell>
  );
}
