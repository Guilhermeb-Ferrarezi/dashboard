import { GameInscricoesPage } from "@/components/admin/game-inscricoes-page";

export const dynamic = "force-dynamic";

export default async function VctInscricoesPage() {
  return (
    <GameInscricoesPage
      modalidade="valorant"
      eyebrow="VCT"
      title="Inscricoes VCT"
      description="Monte e balanceie os times de Valorant a partir das inscricoes recebidas."
    />
  );
}
