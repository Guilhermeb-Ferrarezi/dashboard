"use client";

interface PageMetrics {
  path: string;
  sessions: number;
  activeUsers: number;
  avgSessionDuration: number;
  topChannels: { channel: string; sessions: number }[];
  conversions: { checkoutClicks: number; whatsappClicks: number; ctaVisible: number };
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

function PageCard({ page }: { page: PageMetrics }) {
  const maxChannel = page.topChannels[0]?.sessions ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{page.path}</p>
        <h2 className="text-2xl font-bold text-foreground">{pageName(page.path)}</h2>
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
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive text-sm">
        <p className="font-semibold mb-1">Erro ao carregar analytics</p>
        <p className="font-mono text-xs mt-1 break-all">{error}</p>
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return <p className="text-muted-foreground">Nenhum dado disponível.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {pages.map((page) => (
        <PageCard key={page.path} page={page} />
      ))}
    </div>
  );
}
