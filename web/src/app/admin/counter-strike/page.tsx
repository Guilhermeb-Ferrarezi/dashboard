import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";

export default function CounterStrikePage() {
  return <ClientRedirect to="/counter-strike" label="Counter-strike" />;
}
