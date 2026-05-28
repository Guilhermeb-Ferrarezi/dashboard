import { cookies } from "next/headers";

import { AdminPublicadorPanel } from "@/components/admin/admin-publicador-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { PublishedSiteSummary } from "@/components/admin/admin-publicador-panel";

export const dynamic = "force-dynamic";

export default async function AdminPublicadorPage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  if (user.role !== "admin") {
    return <ClientRedirect to="/painel" label="dashboard" />;
  }

  const cookieHeader = (await cookies()).toString();
  const response = await serverApi<{ sites: PublishedSiteSummary[] }>(
    "/painel/admin/publicador/sites",
    { cookieHeader },
  );

  return (
    <AppShell
      user={user}
      eyebrow="Administração"
      title="Publicador de sites"
      description="Publique ZIPs estáticos em rotas públicas servidas pelo container compartilhado."
    >
      <AdminPublicadorPanel initialSites={response.sites} />
    </AppShell>
  );
}
