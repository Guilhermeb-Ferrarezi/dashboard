import { cookies } from "next/headers";

import { CheckoutClienteDetalhe } from "@/components/checkout/checkout-cliente-detalhe";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutClienteSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutClienteDetalhePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const { clientes } = await serverApi<{ clientes: CheckoutClienteSummary[] }>(
    "/checkout/clientes",
    { cookieHeader }
  );

  const cliente = clientes.find((c) => String(c.userId) === id);

  if (!cliente) {
    return <ClientRedirect to="/checkout/clientes" label="clientes" />;
  }

  return (
    <AppShell user={user} title={cliente.userLogin} description="Detalhe do cliente.">
      <div className="p-6">
        <CheckoutClienteDetalhe cliente={cliente} />
      </div>
    </AppShell>
  );
}
