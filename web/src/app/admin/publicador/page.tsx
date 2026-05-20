import { cookies } from "next/headers";

import { AdminPublicadorPanel } from "@/components/admin/admin-publicador-panel";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { requireAdminSession } from "@/lib/session";
import type { PublishedSiteSummary } from "@/components/admin/admin-publicador-panel";

export const dynamic = "force-dynamic";

export default async function AdminPublicadorPage() {
  const user = await requireAdminSession();
  const cookieHeader = (await cookies()).toString();
  const response = await serverApi<{ sites: PublishedSiteSummary[] }>(
    "/admin/publicador/sites",
    { cookieHeader },
  );

  return (
    <AppShell
      user={user}
      eyebrow="Administracao"
      title="Publicador de sites"
      description="Publique ZIPs estaticos em rotas publicas servidas pelo container compartilhado."
    >
      <AdminPublicadorPanel initialSites={response.sites} />
    </AppShell>
  );
}

