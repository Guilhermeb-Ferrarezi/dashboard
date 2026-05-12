import { GameInscricoesPage } from "@/components/admin/game-inscricoes-page";

export const dynamic = "force-dynamic";

export default async function CounterStrikeInscricoesPage() {
  return (
    <GameInscricoesPage
      modalidade="counter-strike"
      eyebrow="Counter-strike"
      title="Inscricoes Counter-strike"
      description="Monte e balanceie os times de Counter-strike a partir das inscricoes recebidas."
    />
  );
}
