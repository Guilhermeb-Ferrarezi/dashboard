import { cookies } from "next/headers";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { PortalUserSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  if (user.role !== "admin") {
    return <ClientRedirect to="/home" label="dashboard" />;
  }

  const cookieHeader = (await cookies()).toString();
  const response = await serverApi<{ users: PortalUserSummary[] }>(
    "/admin/users",
    { cookieHeader },
  );

  return (
    <AppShell
      user={user}
      eyebrow="Administracao"
      title="Usuarios do home"
      description="Gerencie as contas internas do portal universal."
    >
      <AdminUsersPanel initialUsers={response.users} />
    </AppShell>
  );
}
