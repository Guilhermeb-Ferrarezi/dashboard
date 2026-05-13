import { cookies } from "next/headers";

import { AppShell } from "@/components/portal/app-shell";
import { VctFormacoesPanel } from "@/components/admin/vct-formacoes-panel";
import { serverApi } from "@/lib/api-server";
import { requireAdminSession } from "@/lib/session";
import type { VctFormacaoSummary } from "@/types/portal";

type GameSlug = "valorant" | "counter-strike" | "lol";

interface GameFormacoesPageProps {
  modalidade: GameSlug;
  eyebrow: string;
  title: string;
  description: string;
}

export async function GameFormacoesPage({
  modalidade,
  eyebrow,
  title,
  description,
}: GameFormacoesPageProps) {
  const user = await requireAdminSession();
  const cookieHeader = (await cookies()).toString();
  const query = `modalidade=${encodeURIComponent(modalidade)}`;

  const formacoesRes = await serverApi<{ formacoes: VctFormacaoSummary[] }>(`/vct/formacoes?${query}`, {
    cookieHeader,
  });

  return (
    <AppShell user={user} eyebrow={eyebrow} title={title} description={description}>
      <VctFormacoesPanel initialFormacoes={formacoesRes.formacoes} modalidade={modalidade} />
    </AppShell>
  );
}
