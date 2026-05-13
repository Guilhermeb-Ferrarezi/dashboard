import { GameFormacoesPage } from "@/components/admin/game-formacoes-page";

export const dynamic = "force-dynamic";

export default async function VctFormacoesPage() {
  return (
    <GameFormacoesPage
      modalidade="valorant"
      eyebrow="VCT"
      title="Formacoes VCT"
      description="Veja os times completos recebidos, com capitão, jogadores e logo enviada para o bucket."
    />
  );
}
