import { GameInscricoesPage } from "@/components/admin/game-inscricoes-page";

export const dynamic = "force-dynamic";

export default async function LeagueOfLegendsInscricoesPage() {
  return (
    <GameInscricoesPage
      modalidade="lol"
      eyebrow="League of Legends"
      title="Inscricoes LoL"
      description="Monte e balanceie os times de LoL a partir das inscricoes recebidas."
    />
  );
}
