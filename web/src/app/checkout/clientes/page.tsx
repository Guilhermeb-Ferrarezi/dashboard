import { cookies } from "next/headers";

import { CheckoutClientesLista } from "@/components/checkout/checkout-clientes-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutClienteSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutClientesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const { clientes } = await serverApi<{ clientes: CheckoutClienteSummary[] }>(
    "/checkout/clientes",
    { cookieHeader }
  );

  return (
    <AppShell user={user} title="Clientes" description="Clientes cadastrados no checkout.">
      <div className="p-6">
        <CheckoutClientesLista clientes={clientes} />
      </div>
    </AppShell>
  );
}
