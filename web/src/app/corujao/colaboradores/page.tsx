import { CorujaoColaboradoresLista } from "@/components/corujao/corujao-colaboradores-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CorujaoColaboradoresPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Corujão", href: "/corujao" }]}
      title="Colaboradores"
      description="Quem fecha venda do Corujão. Base do Método 4."
    >
      <CorujaoColaboradoresLista />
    </AppShell>
  );
}
