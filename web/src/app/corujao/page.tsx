import { cookies } from "next/headers";

import { CorujaoClientesPanel } from "@/components/corujao/corujao-clientes-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CorujaoClienteSummary, CorujaoStats } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CorujaoClientesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();

  const [clientesData, statsData] = await Promise.all([
    serverApi<{ clientes: CorujaoClienteSummary[] }>("/corujao/clientes?limit=200", { cookieHeader }).catch(() => ({ clientes: [] })),
    serverApi<{ stats: CorujaoStats }>("/corujao/stats", { cookieHeader }).catch(() => ({
      stats: { totalClientes: 0, clientesAtivos: 0, totalSessoes: 0, jaVieram: 0 }
    }))
  ]);

  return (
    <AppShell user={user} title="Corujão — Clientes" description="Clientes do serviço Corujão.">
      <div className="p-6">
        <CorujaoClientesPanel
          initialClientes={clientesData.clientes}
          initialStats={statsData.stats}
        />
      </div>
    </AppShell>
  );
}
