import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";

export default function VctInscricoesPage() {
  return <ClientRedirect to="/painel/admin/vct" label="Admin VCT" />;
}
