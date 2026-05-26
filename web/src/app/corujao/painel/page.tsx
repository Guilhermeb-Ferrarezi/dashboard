import { CorujaoPainel } from "@/components/corujao/corujao-painel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CorujaoPainelPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  return (
    <AppShell
      user={user}
      breadcrumb={[{ label: "Corujão", href: "/corujao" }]}
      title="Painel"
      description="Meta vs. realizado — fiscalização do Corujão."
    >
      <CorujaoPainel />
    </AppShell>
  );
}
