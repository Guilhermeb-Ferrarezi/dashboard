import { cookies } from "next/headers";

import { CheckoutCuponsPanel } from "@/components/checkout/checkout-cupons-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutCupomSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutCuponsPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const data = await serverApi<{ cupons: CheckoutCupomSummary[] }>("/checkout/cupons", { cookieHeader });

  return (
    <AppShell user={user} title="Cupons" description="Gerencie os cupons de desconto.">
      <div className="p-6">
        <CheckoutCuponsPanel initialCupons={data?.cupons ?? []} />
      </div>
    </AppShell>
  );
}
