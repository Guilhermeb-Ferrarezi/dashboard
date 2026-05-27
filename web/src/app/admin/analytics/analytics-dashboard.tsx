"use client";

import { useEffect, useState } from "react";
import { clientApi } from "@/lib/api";

interface PageMetrics {
  path: string;
  sessions: number;
  activeUsers: number;
  avgSessionDuration: number;
  topChannels: { channel: string; sessions: number }[];
  conversions: { checkoutClicks: number; whatsappClicks: number; ctaVisible: number };
}

interface RealtimeData {
  pages: Record<string, number>;
  totalActive: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function pageName(path: string) {
  if (path === "/play/corujao") return "Corujão";
  if (path === "/play/mix") return "Mix";
  return path;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChannelBar({ channel, sessions, max }: { channel: string; sessions: number; max: number }) {
  const pct = max > 0 ? (sessions / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 truncate text-muted-foreground capitalize">{channel}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-foreground font-medium">{sessions}</span>
    </div>
  );
}

function RealtimeBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
      {count} agora
    </span>
  );
}

function RealtimePanel({ data }: { data: RealtimeData | null }) {
  const pages = ["/play/corujao", "/play/mix"];

  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm font-semibold text-green-400 uppercase tracking-wider">Ao vivo agora</p>
        </div>
        {data && (
          <span className="text-2xl font-bold text-green-400">{data.totalActive} usuários ativos</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {pages.map((path) => (
          <div key={path} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">{path}</p>
              <p className="text-base font-bold">{pageName(path)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-400">{data?.pages[path] ?? 0}</p>
              <p className="text-xs text-muted-foreground">ativos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageCard({ page, realtimeCount }: { page: PageMetrics; realtimeCount: number }) {
  const maxChannel = page.topChannels[0]?.sessions ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{page.path}</p>
          <h2 className="text-2xl font-bold text-foreground">{pageName(page.path)}</h2>
        </div>
        <RealtimeBadge count={realtimeCount} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Sessões" value={page.sessions.toLocaleString("pt-BR")} />
        <MetricCard label="Usuários únicos" value={page.activeUsers.toLocaleString("pt-BR")} />
        <MetricCard label="Tempo médio" value={formatDuration(page.avgSessionDuration)} />
        <MetricCard label="Cliques Checkout" value={page.conversions.checkoutClicks} />
      </div>

      {page.topChannels.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Origem de tráfego</p>
          {page.topChannels.map((ch) => (
            <ChannelBar key={ch.channel} channel={ch.channel} sessions={ch.sessions} max={maxChannel} />
          ))}
        </div>
      )}

      <div className="flex gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Visualizaram o CTA</p>
          <p className="text-lg font-bold text-green-500">{page.conversions.ctaVisible}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Clicaram no Checkout</p>
          <p className="text-lg font-bold text-green-500">{page.conversions.checkoutClicks}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Suporte WhatsApp</p>
          <p className="text-lg font-bold text-green-500">{page.conversions.whatsappClicks}</p>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({
  pages,
  error,
}: {
  pages: PageMetrics[] | null;
  error: string | null;
}) {
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);

  useEffect(() => {
    async function fetchRealtime() {
      try {
        const data = await clientApi<RealtimeData>("/analytics/realtime");
        setRealtime(data);
      } catch {
        // silencia erros de realtime — não bloqueia o dashboard
      }
    }

    fetchRealtime();
    const id = setInterval(fetchRealtime, 30_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive text-sm">
        <p className="font-semibold mb-1">Erro ao carregar analytics</p>
        <p className="font-mono text-xs mt-1 break-all">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RealtimePanel data={realtime} />

      {(!pages || pages.length === 0) ? (
        <p className="text-muted-foreground text-sm">Sem dados históricos ainda — aguarde 24-48h após a primeira visita às páginas de venda.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pages.map((page) => (
            <PageCard
              key={page.path}
              page={page}
              realtimeCount={realtime?.pages[page.path] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
