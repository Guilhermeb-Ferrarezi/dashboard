import { cookies } from "next/headers";

import { CheckoutClientesPanel } from "@/components/checkout/checkout-clientes-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutClienteSummary, CheckoutNovosPorMes } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutClientesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const [{ clientes }, { data: novosPorMes }] = await Promise.all([
    serverApi<{ clientes: CheckoutClienteSummary[] }>("/checkout/clientes", { cookieHeader }),
    serverApi<{ data: CheckoutNovosPorMes[] }>("/checkout/novos-por-mes", { cookieHeader })
  ]);

  return (
    <AppShell user={user} title="Clientes" description="Clientes cadastrados no checkout.">
      <div className="p-6">
        <CheckoutClientesPanel initialClientes={clientes} novosPorMes={novosPorMes} />
      </div>
    </AppShell>
  );
}
