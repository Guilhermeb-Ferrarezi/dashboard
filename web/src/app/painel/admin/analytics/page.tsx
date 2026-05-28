import { cookies } from "next/headers";
import { AppShell } from "@/components/portal/app-shell";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { getSessionUser } from "@/lib/session";
import { serverApi } from "@/lib/api-server";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

interface PageMetrics {
  path: string;
  sessions: number;
  activeUsers: number;
  avgSessionDuration: number;
  topChannels: { channel: string; sessions: number }[];
  conversions: { whatsappClicks: number; ctaVisible: number };
}

interface AnalyticsResponse {
  pages: PageMetrics[];
}

export default async function AnalyticsPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/painel" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();

  let data: AnalyticsResponse | null = null;
  let error: string | null = null;

  try {
    data = await serverApi<AnalyticsResponse>("/analytics/sales-pages", { cookieHeader });
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro desconhecido ao carregar GA4.";
  }

  return (
    <AppShell
      user={user}
      eyebrow="Analytics"
      title="Páginas de Venda"
      description="Métricas das páginas Corujão e Mix nos últimos 30 dias."
    >
      <AnalyticsDashboard pages={data?.pages ?? null} error={error} />
    </AppShell>
  );
}
