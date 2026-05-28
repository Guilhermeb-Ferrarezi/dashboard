import { cookies } from "next/headers";

import { CheckoutDashboardPanel } from "@/components/checkout/checkout-dashboard-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutDashboardData } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutDashboardPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const data = await serverApi<CheckoutDashboardData>("/checkout/dashboard", { cookieHeader });

  return (
    <AppShell user={user} title="Checkout" description="Visão geral do checkout.">
      <div className="p-6">
        <CheckoutDashboardPanel data={data} />
      </div>
    </AppShell>
  );
}
