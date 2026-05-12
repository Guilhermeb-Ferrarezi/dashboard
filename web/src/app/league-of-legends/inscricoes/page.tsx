import { GameInscricoesPage } from "@/components/admin/game-inscricoes-page";

export const dynamic = "force-dynamic";

export default async function LeagueOfLegendsInscricoesPage() {
  return (
    <GameInscricoesPage
      modalidade="lol"
      eyebrow="League of Legends"
      title="Inscricoes League of Legends"
      description="Monte e balanceie os times de League of Legends a partir das inscricoes recebidas."
    />
  );
}
