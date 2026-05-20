import { cookies } from "next/headers";

import { VctInscricoesPanel } from "@/components/admin/vct-inscricoes-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { VctInscricaoSummary, VctTimeSummary } from "@/types/portal";

type GameSlug = "valorant" | "counter-strike" | "lol";

interface GameInscricoesPageProps {
  modalidade: GameSlug;
  eyebrow: string;
  title: string;
  description: string;
}

export async function GameInscricoesPage({
  modalidade,
  eyebrow,
  title,
  description,
}: GameInscricoesPageProps) {
  const user = await getSessionUser();
  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  const cookieHeader = (await cookies()).toString();
  const query = `modalidade=${encodeURIComponent(modalidade)}`;

  const [inscricoesRes, timesRes] = await Promise.all([
    serverApi<{ inscricoes: VctInscricaoSummary[] }>(`/vct/inscricoes?${query}`, {
      cookieHeader,
    }),
    serverApi<{ times: VctTimeSummary[] }>(`/vct/times?${query}`, { cookieHeader }),
  ]);

  return (
    <AppShell
      user={user}
      eyebrow={eyebrow}
      title={title}
      description={description}
      fullWidth
    >
      <VctInscricoesPanel
        initialInscricoes={inscricoesRes.inscricoes}
        initialTimes={timesRes.times}
        modalidade={modalidade}
      />
    </AppShell>
  );
}
