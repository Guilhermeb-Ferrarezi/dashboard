import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";

export default function VctPage() {
  return <ClientRedirect to="/vct/inscricoes" label="VCT" />;
}
