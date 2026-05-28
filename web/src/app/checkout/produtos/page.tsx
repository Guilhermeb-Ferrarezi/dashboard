import { cookies } from "next/headers";

import { CheckoutProdutosPanel } from "@/components/checkout/checkout-produtos-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutProductSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutProdutosPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const { produtos } = await serverApi<{ produtos: CheckoutProductSummary[] }>("/checkout/produtos", { cookieHeader });

  return (
    <AppShell user={user} title="Produtos" description="Produtos disponíveis no checkout.">
      <div className="p-6">
        <CheckoutProdutosPanel initialProdutos={produtos} />
      </div>
    </AppShell>
  );
}
