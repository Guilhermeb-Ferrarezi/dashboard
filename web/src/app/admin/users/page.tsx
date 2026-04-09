import { cookies } from "next/headers";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import type { PortalUserSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireAdminSession();
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
