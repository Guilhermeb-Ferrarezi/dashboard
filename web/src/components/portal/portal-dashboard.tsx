"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PortalSearchLauncher } from "@/components/portal/portal-quick-search";
import {
  ExternalLinkIcon,
  LayoutGridIcon,
  LogsIcon,
  ShieldCheckIcon,
  StarIcon,
  ZapIcon,
} from "@/components/ui/icons";
import type { SessionUser } from "@/lib/session";
import type { PortalProject } from "@/types/portal";
import type {
  DashboardSummary,
  DashboardWindowKey,
  DashboardWindowSummary,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface PortalDashboardProps {
  user: SessionUser;
  projects: PortalProject[];
  summary: DashboardSummary | null;
}

const rangeOptions: Array<{ key: DashboardWindowKey; label: string }> = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

const routeCards = [
  {
    href: "/projects",
    label: "Projetos",
    description: "Abrir o catálogo completo dos apps internos.",
    icon: LayoutGridIcon,
  },
  {
    href: "/logs",
    label: "Logs",
    description: "Ir para observabilidade e histórico recente.",
    icon: LogsIcon,
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    description: "Gerenciar acesso e perfis administrativos.",
    icon: ShieldCheckIcon,
  },
] as const;

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0 ms";
  }

  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s`;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatTimeLabel(label: string) {
  if (label.includes("/")) {
    return label;
  }

  return label.replace(/h$/u, ":00");
}

function maxValue(items: number[]) {
  return Math.max(...items, 1);
}

function TimelineBars({
  data,
  accentClass,
  errorClass,
}: {
  data: DashboardWindowSummary["buckets"];
  accentClass: string;
  errorClass: string;
}) {
  const maxRegistrations = maxValue(data.map((point) => point.registrations));
  const maxErrors = maxValue(data.map((point) => point.errors));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[720px] gap-2"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((point) => {
          const registrationHeight = `${Math.max((point.registrations / maxRegistrations) * 100, point.registrations ? 14 : 6)}%`;
          const errorHeight = `${Math.max((point.errors / maxErrors) * 100, point.errors ? 10 : 0)}%`;

          return (
            <div key={point.label} className="flex min-h-[190px] flex-col items-center gap-2">
              <div className="relative flex h-40 w-full items-end overflow-hidden rounded-2xl border border-border/50 bg-background/70 p-1">
                <div
                  className={cn("w-full rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]", accentClass)}
                  style={{ height: registrationHeight }}
                />
                {point.errors > 0 ? (
                  <div
                    className={cn("absolute left-1 right-1 top-1 rounded-full", errorClass)}
                    style={{ height: errorHeight }}
                  />
                ) : null}
              </div>
              <div className="flex w-full flex-col items-center gap-1 text-center">
                <span className="text-[11px] font-medium text-foreground">
                  {point.registrations}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {formatTimeLabel(point.label)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineLine({
  data,
  strokeClass,
}: {
  data: DashboardWindowSummary["buckets"];
  strokeClass: string;
}) {
  const values = data.map((point) => point.avgDurationMs);
  const max = maxValue(values);
  const width = 760;
  const height = 220;
  const paddingX = 20;
  const paddingY = 20;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const points = values.map((value, index) => {
    const x = paddingX + index * step;
    const normalized = value / max;
    const y = paddingY + innerHeight - normalized * innerHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${paddingX + innerWidth} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full min-w-[760px]"
        role="img"
        aria-label="Gráfico de tempo médio de resposta"
      >
        <defs>
          <linearGradient id="latency-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g className="text-border">
          {[0, 1, 2, 3].map((index) => {
            const y = paddingY + (innerHeight / 3) * index;
            return (
              <line
                key={index}
                x1={paddingX}
                x2={paddingX + innerWidth}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.16"
              />
            );
          })}
        </g>
        <path d={areaPath} fill="url(#latency-fill)" className={strokeClass} />
        <path
          d={linePath}
          fill="none"
          className={strokeClass}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            className={strokeClass}
          />
        ))}
      </svg>
    </div>
  );
}

export function PortalDashboard({ user, projects, summary }: PortalDashboardProps) {
  const [selectedRange, setSelectedRange] = useState<DashboardWindowKey>(
    summary?.windows[0]?.key ?? "24h",
  );

  const selectedWindow =
    summary?.windows.find((window) => window.key === selectedRange) ??
    summary?.windows[0] ??
    null;

  const totalProjects = projects.length;
  const liveProjects = projects.filter((project) => project.status === "live").length;
  const pilotProjects = projects.filter((project) => project.status === "pilot").length;
  const betaProjects = projects.filter((project) => project.status === "beta").length;
  const ssoProjects = projects.filter((project) => project.ssoMode !== "none").length;
  const featuredProjects = projects.filter((project) => project.featured);

  const projectStats = [
    { label: "Projetos", value: totalProjects, delta: "base ativa", icon: LayoutGridIcon },
    { label: "Com SSO", value: ssoProjects, delta: "fluxos autenticados", icon: ShieldCheckIcon },
    { label: "Live", value: liveProjects, delta: "em produção", icon: ZapIcon },
    { label: "Destaques", value: featuredProjects.length, delta: "projetos prioritários", icon: StarIcon },
  ];

  const projectHealth = summary?.projects.slice(0, 4) ?? [];
  const hasSummary = Boolean(summary && selectedWindow);

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
        <div className="grid gap-6 border-b border-border/70 px-6 py-6 lg:grid-cols-[1.2fr_auto] lg:items-center">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-primary">
              Universal Home
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">
                Dashboard operacional
              </h1>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {user.role.toUpperCase()}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Visão geral real da operação. A home mostra inscrições, erros de
              logs e tempo de resposta. O catálogo fica na aba de projetos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {rangeOptions.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant={selectedRange === option.key ? "default" : "outline"}
                className="rounded-full px-4"
                onClick={() => setSelectedRange(option.key)}
              >
                {option.label}
              </Button>
            ))}
            <Button render={<Link href="/projects" />} className="gap-2">
              <LayoutGridIcon className="size-4" />
              Ir para projetos
            </Button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4">
          {projectStats.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label} size="sm" className="border-border/70 bg-background/70">
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardDescription>{item.label}</CardDescription>
                      <CardTitle className="text-3xl font-semibold tracking-[-0.04em]">
                        {item.value}
                      </CardTitle>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {item.delta}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Panorama do periodo</CardTitle>
                  <CardDescription>
                    {selectedWindow?.label ?? "Sem dados"} de inscrições, logs e latência.
                  </CardDescription>
                </div>
                {selectedWindow ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full">
                      {selectedWindow.registrations} inscrições
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedWindow.errors} erros
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedWindow.logs} logs
                    </Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              {hasSummary && selectedWindow ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Inscrições e erros</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          barras por período
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Inscrições
                        <span className="ml-2 h-2 w-2 rounded-full bg-rose-500" />
                        Erros
                      </div>
                    </div>
                    <TimelineBars
                      data={selectedWindow.buckets}
                      accentClass="bg-emerald-400/90"
                      errorClass="bg-rose-500/90"
                    />
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Tempo de resposta</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          média por bucket
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full">
                          Média {formatDuration(selectedWindow.avgDurationMs)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          P95 {formatDuration(selectedWindow.p95DurationMs)}
                        </Badge>
                      </div>
                    </div>
                    <TimelineLine
                      data={selectedWindow.buckets}
                      strokeClass="text-sky-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-6 py-10 text-sm text-muted-foreground">
                  Ainda nao foi possivel carregar o resumo do dashboard.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card/90">
              <CardHeader className="border-b border-border/70">
                <CardTitle>Ultimas inscricoes</CardTitle>
                <CardDescription>
                  Entradas reais mais recentes da base.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {summary?.recentRegistrations.length ? (
                  summary.recentRegistrations.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.nick} · {item.modalidade}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.status}
                        </p>
                        <p className="text-sm text-foreground">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-10 text-sm text-muted-foreground">
                    Nenhuma inscricao recente encontrada.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader className="border-b border-border/70">
                <CardTitle>Erros recentes</CardTitle>
                <CardDescription>
                  Falhas de API ou servidor registradas no periodo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {summary?.recentLogs.length ? (
                  summary.recentLogs.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item.projectName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {item.method} {item.endpoint}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.status} · {formatDuration(item.durationMs)}
                        </p>
                        <p className="text-sm text-foreground">
                          {formatDateTime(item.occurredAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-10 text-sm text-muted-foreground">
                    Nenhum erro recente encontrado.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Requisicoes mais lentas</CardTitle>
              <CardDescription>
                Atalho para investigar latencia e gargalos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 lg:grid-cols-2">
              {summary?.slowRequests.length ? (
                summary.slowRequests.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.projectName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {item.method} {item.endpoint}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {formatDuration(item.durationMs)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.status}</span>
                      <span>{formatDateTime(item.occurredAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-10 text-sm text-muted-foreground lg:col-span-2">
                  Nenhuma requisicao lenta encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Saude do portal</CardTitle>
              <CardDescription>
                Leitura rapida dos projetos e da base de logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Projetos</span>
                <span className="text-sm font-medium text-foreground">{totalProjects}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Live</span>
                <span className="text-sm font-medium text-foreground">{liveProjects}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Piloto</span>
                <span className="text-sm font-medium text-foreground">{pilotProjects}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Beta</span>
                <span className="text-sm font-medium text-foreground">{betaProjects}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Projetos com mais logs</CardTitle>
              <CardDescription>
                Quem mais gerou volume e erro recentemente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {projectHealth.length ? (
                projectHealth.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.totalLogs} logs · {project.errorLogs} erros
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {formatDuration(project.avgDurationMs)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.latestAt ? formatDateTime(project.latestAt) : "Sem dados"}
                        </p>
                      </div>
                    </div>
                    {project.latestEndpoint ? (
                      <p className="mt-3 truncate text-xs text-muted-foreground">
                        {project.latestStatus ?? "-"} · {project.latestEndpoint}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-10 text-sm text-muted-foreground">
                  Nenhum projeto de logs encontrado.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Acesso rapido</CardTitle>
              <CardDescription>
                Caminhos diretos para as telas mais usadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {routeCards.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-background"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Busca e navegação</CardTitle>
              <CardDescription>
                Use a busca rápida para saltar entre telas, projetos e ações.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">
                  O dashboard agora mostra métricas reais da API. A aba de projetos
                  continua como entrada dedicada para abrir os apps.
                </p>
                <div className="mt-4">
                  <PortalSearchLauncher variant="header" className="w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {summary ? (
            <div className="rounded-2xl border border-border/70 bg-card/90 p-4 text-xs text-muted-foreground">
              Atualizado em {formatDateTime(summary.generatedAt)}.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
