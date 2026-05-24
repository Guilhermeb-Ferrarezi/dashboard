import { CheckoutClientesLista } from "@/components/checkout/checkout-clientes-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CheckoutClientesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  return (
    <AppShell user={user} breadcrumb={[{ label: "Checkout", href: "/checkout" }]} title="Clientes" description="Clientes cadastrados no checkout.">
      <CheckoutClientesLista />
    </AppShell>
  );
}
