import { cookies } from "next/headers";

import { VctInscricoesPanel } from "@/components/admin/vct-inscricoes-panel";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import type { VctInscricaoSummary, VctTimeSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function VctInscricoesPage() {
  const user = await requireAdminSession();
  const cookieHeader = (await cookies()).toString();

  const [inscricoesRes, timesRes] = await Promise.all([
    serverApi<{ inscricoes: VctInscricaoSummary[] }>("/vct/inscricoes", { cookieHeader }),
    serverApi<{ times: VctTimeSummary[] }>("/vct/times", { cookieHeader }),
  ]);

  return (
    <AppShell
      user={user}
      eyebrow="VCT Ribeirão"
      title="Inscrições VCT"
      description="Monte e balanceie os times a partir das inscrições recebidas."
    >
      <VctInscricoesPanel
        initialInscricoes={inscricoesRes.inscricoes}
        initialTimes={timesRes.times}
      />
    </AppShell>
  );
}
