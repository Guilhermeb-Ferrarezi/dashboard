"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  ExternalLinkIcon,
  InboxIcon,
  LayoutDashboardIcon,
  InfoIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  LogsIcon,
  OctagonXIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  StarIcon,
  TriangleAlertIcon,
  ZapIcon,
  type LucideIcon,
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

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return compactNumber.format(value);
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
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
  if (label.includes("/")) return label;
  return label.replace(/h$/u, ":00");
}

const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function formatRelative(iso: string) {
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return "agora";
  const diffSec = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeFormatter.format(diffSec, "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return relativeFormatter.format(Math.round(diffSec / 86400), "day");
  return relativeFormatter.format(Math.round(diffSec / 604800), "week");
}

function maxValue(items: number[]) {
  return Math.max(...items, 1);
}

function Sparkline({ data, className, tooltip }: { data: number[]; className?: string; tooltip?: string }) {
  if (data.length < 2) return <div className={cn("h-6 w-full rounded-full bg-muted/30", className)} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  const w = 100;
  const h = 24;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const summary = tooltip ?? `pico ${max} · média ${avg.toFixed(1)} · mínimo ${min}`;
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn("block h-6 w-full cursor-help bg-transparent text-primary/70 outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        aria-label={summary}
      >
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="size-full" aria-hidden>
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-0.5 font-medium">
          <p className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">Pico:</span>
            <span>{max}</span>
          </p>
          <p className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">Média:</span>
            <span>{avg.toFixed(1)}</span>
          </p>
          <p className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">Mínimo:</span>
            <span>{min}</span>
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const HTTP_METHOD_STYLE: Record<string, string> = {
  GET: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  POST: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PUT: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  PATCH: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  DELETE: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

function MethodPill({ method }: { method: string }) {
  const key = method?.toUpperCase?.() ?? "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
        HTTP_METHOD_STYLE[key] ?? "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {method || "—"}
    </span>
  );
}

function StatusPill({ status }: { status: number }) {
  const cls =
    status >= 500
      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
      : status >= 400
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : status >= 300
          ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function getErrorRateColor(rate: number) {
  if (rate >= 5) return "text-rose-400";
  if (rate >= 1) return "text-amber-400";
  return "text-emerald-400";
}

function TrendBadge({
  trend,
  invert = false,
}: {
  trend: { dir: "up" | "down"; pct: number } | null;
  invert?: boolean;
}) {
  if (!trend) return null;
  const good = invert ? trend.dir === "down" : trend.dir === "up";
  const tone = good ? "text-emerald-400" : "text-rose-400";
  const Icon = trend.dir === "up" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums", tone)}>
      <Icon className="size-3" />
      {trend.pct >= 100 ? "+99%" : `${trend.pct.toFixed(0)}%`}
    </span>
  );
}

function AnimatedNumber({ value, format = formatCount }: { value: number; format?: (n: number) => string }) {
  const animated = useCountUp(value);
  return <>{format(animated)}</>;
}

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target) || target <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    function step(t: number) {
      const progress = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function InitialAvatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  // Paleta neutra (Linear-style) — diferenciação via inicial, não cor.
  // Mantém uma variação sutil de opacidade pra não virar todo um chumbo.
  const palette = [
    "bg-foreground/10 text-foreground/80",
    "bg-foreground/8 text-foreground/75",
    "bg-foreground/12 text-foreground/85",
  ];
  const code = initial.charCodeAt(0) || 0;
  const cls = palette[code % palette.length];
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
        cls,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function TimelineBars({
  data,
  accentClass,
  errorClass,
  peakIndex = -1,
}: {
  data: DashboardWindowSummary["buckets"];
  accentClass: string;
  errorClass: string;
  peakIndex?: number;
}) {
  const maxRegistrations = maxValue(data.map((point) => point.registrations + point.errors));
  const totalRegistrations = data.reduce((sum, p) => sum + p.registrations, 0);
  const totalErrors = data.reduce((sum, p) => sum + p.errors, 0);

  const targetLabels = 6;
  const labelEvery = Math.max(1, Math.ceil(data.length / targetLabels));
  const gridLines = [0, 25, 50, 75, 100];
  const yAxisValues = [maxRegistrations, Math.round(maxRegistrations * 0.5), 0];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[560px] gap-3">
        {/* Eixo Y */}
        <div className="flex w-8 flex-col justify-between py-1 text-right text-[10px] tabular-nums text-muted-foreground/70">
          {yAxisValues.map((v) => (
            <span key={v} className="leading-none">{v}</span>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          <div
            className="relative grid h-44 gap-1"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            aria-label="Gráfico de inscrições e erros por período"
            role="img"
          >
            {/* Gridlines */}
            <div className="pointer-events-none absolute inset-0">
              {gridLines.map((line) => (
                <div
                  key={line}
                  className="absolute inset-x-0 border-t border-border/30"
                  style={{ top: `${line}%` }}
                />
              ))}
            </div>

            {data.map((point, index) => {
              const totalValue = point.registrations + point.errors;
              const totalPct = totalValue > 0 ? (totalValue / maxRegistrations) * 100 : 0;
              const errorPct = totalValue > 0 ? (point.errors / totalValue) * 100 : 0;
              const isPeak = index === peakIndex;
              const minHeight = totalValue > 0 ? Math.max(totalPct, 4) : 1.5;

              return (
                <Tooltip key={point.label}>
                  <TooltipTrigger
                    className="group relative flex h-full cursor-pointer items-end justify-center bg-transparent outline-none hover:bg-foreground/5 focus-visible:bg-foreground/5"
                    aria-label={`${formatTimeLabel(point.label)}: ${point.registrations} inscrições, ${point.errors} erros`}
                  >
                    <div
                      className={cn(
                        "relative flex w-full max-w-[18px] flex-col-reverse overflow-hidden rounded-t-md transition-all group-hover:brightness-125 group-focus-visible:brightness-125",
                        isPeak && "ring-2 ring-amber-500/50",
                        totalValue === 0 && "bg-muted/20",
                      )}
                      style={{ height: `${minHeight}%` }}
                    >
                      {point.registrations > 0 ? (
                        <div className={cn(accentClass, "w-full")} style={{ height: `${100 - errorPct}%` }} />
                      ) : null}
                      {point.errors > 0 ? (
                        <div className={cn(errorClass, "w-full")} style={{ height: `${errorPct}%` }} />
                      ) : null}
                    </div>

                    {isPeak ? (
                      <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500/20 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                        pico
                      </span>
                    ) : null}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-1 font-medium">
                      <p className="text-foreground">{formatTimeLabel(point.label)}</p>
                      <p className="flex items-center justify-between gap-3 tabular-nums">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          Inscrições
                        </span>
                        <span>{point.registrations}</span>
                      </p>
                      <p className="flex items-center justify-between gap-3 tabular-nums">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-rose-500" />
                          Erros
                        </span>
                        <span className={cn(point.errors > 0 && "text-rose-400")}>{point.errors}</span>
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Eixo X — labels rotacionadas para evitar truncamento */}
          <div
            className="mt-2 grid h-8 gap-1"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
          >
            {data.map((point, index) => (
              <div key={point.label} className="flex items-start justify-center overflow-visible">
                {index % labelEvery === 0 ? (
                  <span className="origin-top-right -rotate-45 whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatTimeLabel(point.label)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-[11px] tabular-nums text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{totalRegistrations}</span> inscrições no período
        </span>
        {totalErrors > 0 ? (
          <span>
            · <span className="font-semibold text-rose-400">{totalErrors}</span> erros
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TimelineLine({ data, strokeClass }: { data: DashboardWindowSummary["buckets"]; strokeClass: string }) {
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
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${paddingX + innerWidth} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;
  return (
    <div className="relative overflow-x-auto">
      <div className="relative min-w-[760px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-56 w-full" role="img" aria-label="Gráfico de tempo médio de resposta">
          <defs>
            <linearGradient id="latency-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <g className="text-border">
            {[0, 1, 2, 3].map((index) => {
              const y = paddingY + (innerHeight / 3) * index;
              return <line key={index} x1={paddingX} x2={paddingX + innerWidth} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.16" />;
            })}
          </g>
          <path d={areaPath} fill="url(#latency-fill)" className={strokeClass} />
          <path d={linePath} fill="none" className={strokeClass} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="4" className={strokeClass} />
          ))}
        </svg>
        {/* Hit areas HTML com tooltip shadcn */}
        <div className="absolute inset-0 flex">
          {points.map((point, index) => {
            const bucket = data[index];
            const leftPct = ((point.x - step / 2) / width) * 100;
            const widthPct = (step / width) * 100;
            return (
              <Tooltip key={index}>
                <TooltipTrigger
                  className="absolute top-0 h-full cursor-help bg-transparent outline-none focus-visible:bg-foreground/5"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  aria-label={`${formatTimeLabel(bucket.label)}: ${formatDuration(bucket.avgDurationMs)}`}
                />
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1 font-medium">
                    <p className="text-foreground">{formatTimeLabel(bucket.label)}</p>
                    <p className="flex items-center justify-between gap-3 tabular-nums">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2 rounded-full bg-sky-400" />
                        Tempo médio
                      </span>
                      <span>{formatDuration(bucket.avgDurationMs)}</span>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PortalDashboard({ user, projects, summary }: PortalDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DashboardWindowKey>(
    summary?.windows[0]?.key ?? "24h",
  );
  const [now, setNow] = useState(0);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [statusFilter, setStatusFilter] = useState<"all" | "client" | "server">("all");

  useEffect(() => {
    const savedRange = window.localStorage.getItem("dashboard:range");
    if (savedRange === "24h" || savedRange === "7d" || savedRange === "30d") {
      setSelectedRange(savedRange);
    }
    if (window.localStorage.getItem("dashboard:density") === "compact") {
      setDensity("compact");
    }
    setNow(Date.now());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) window.localStorage.setItem("dashboard:range", selectedRange);
  }, [mounted, selectedRange]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem("dashboard:density", density);
  }, [mounted, density]);

  useEffect(() => {
    if (!mounted) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [mounted]);

  const selectedWindow = summary?.windows.find((w) => w.key === selectedRange) ?? summary?.windows[0] ?? null;

  const totalProjects = projects.length;
  const liveProjects = projects.filter((p) => p.status === "live").length;
  const pilotProjects = projects.filter((p) => p.status === "pilot").length;
  const betaProjects = projects.filter((p) => p.status === "beta").length;
  const ssoProjects = projects.filter((p) => p.ssoMode !== "none").length;
  const featuredProjects = projects.filter((p) => p.featured);

  const errorRate = selectedWindow && selectedWindow.logs > 0 ? (selectedWindow.errors / selectedWindow.logs) * 100 : 0;

  const sparkBuckets = selectedWindow?.buckets ?? [];
  const sparkRegistrations = sparkBuckets.map((b) => b.registrations);
  const sparkLogs = sparkBuckets.map((b) => b.logs);
  const sparkErrors = sparkBuckets.map((b) => b.errors);
  const sparkLatency = sparkBuckets.map((b) => b.avgDurationMs);

  type StatCard = {
    label: string;
    rawValue: number;
    hint: string;
    icon: LucideIcon;
    tone: string;
    spark?: number[];
    progress?: { value: number; total: number; tone: string };
  };

  const projectStats: StatCard[] = [
    {
      label: "Projetos",
      rawValue: totalProjects,
      hint: "base ativa",
      icon: LayoutGridIcon,
      tone: "bg-primary/10 text-primary",
      spark: sparkLogs.length ? sparkLogs : undefined,
    },
    {
      label: "Com SSO",
      rawValue: ssoProjects,
      hint: totalProjects ? `${Math.round((ssoProjects / totalProjects) * 100)}% do catálogo` : "—",
      icon: ShieldCheckIcon,
      tone: "bg-foreground/8 text-foreground/80",
      progress: { value: ssoProjects, total: totalProjects, tone: "bg-foreground/50" },
    },
    {
      label: "Live",
      rawValue: liveProjects,
      hint: totalProjects ? `${Math.round((liveProjects / totalProjects) * 100)}% em produção` : "—",
      icon: ZapIcon,
      tone: "bg-emerald-500/10 text-emerald-400",
      progress: { value: liveProjects, total: totalProjects, tone: "bg-emerald-500" },
    },
    {
      label: "Destaques",
      rawValue: featuredProjects.length,
      hint: featuredProjects.length ? `${featuredProjects.length} priorizados` : "nenhum destacado",
      icon: StarIcon,
      tone: "bg-amber-500/10 text-amber-400",
      progress: { value: featuredProjects.length, total: totalProjects, tone: "bg-amber-500" },
    },
  ];

  const projectHealth = summary?.projects.slice(0, 4) ?? [];
  const hasSummary = Boolean(summary && selectedWindow);
  const updatedAgo = mounted && summary ? formatRelative(summary.generatedAt) : null;
  const updatedAtMs = summary ? new Date(summary.generatedAt).getTime() : 0;
  const isFresh = mounted && updatedAtMs > 0 && now - updatedAtMs < 30_000;

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  // Atalho R para refresh
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        startTransition(() => router.refresh());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const timezoneShort = mounted && timezone ? timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone : "";

  const rangeFullLabel = selectedRange === "24h" ? "últimas 24 horas" : selectedRange === "7d" ? "últimos 7 dias" : "últimos 30 dias";

  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    if (window.localStorage.getItem("dashboard:focus") === "1") setFocusMode(true);
  }, []);
  useEffect(() => {
    if (mounted) window.localStorage.setItem("dashboard:focus", focusMode ? "1" : "0");
  }, [mounted, focusMode]);

  function isItemNew(iso: string) {
    if (!mounted) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && now - t < 5 * 60_000;
  }

  function handleExportCsv() {
    if (!summary) {
      toast.error("Sem dados para exportar.");
      return;
    }
    const rows: Array<Record<string, string | number>> = [];
    for (const item of summary.recentRegistrations) {
      rows.push({
        tipo: "inscricao",
        criadoEm: item.createdAt,
        nome: item.nome,
        nick: item.nick,
        modalidade: item.modalidade,
        status: item.status,
        endpoint: "",
        method: "",
        statusCode: "",
        latenciaMs: "",
        projeto: "",
      });
    }
    for (const item of summary.recentLogs) {
      rows.push({
        tipo: "log",
        criadoEm: item.occurredAt,
        nome: "",
        nick: "",
        modalidade: "",
        status: "",
        endpoint: item.endpoint,
        method: item.method,
        statusCode: item.status,
        latenciaMs: Math.round(item.durationMs),
        projeto: item.projectName,
      });
    }
    if (rows.length === 0) {
      toast.info("Nada para exportar.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`dashboard-${selectedRange}-${stamp}.csv`, rows);
    toast.success(`${rows.length} linhas exportadas.`);
  }

  async function handleCopySummary() {
    if (!selectedWindow) {
      toast.error("Sem dados para copiar.");
      return;
    }
    const lines = [
      `Dashboard — ${rangeFullLabel}`,
      `Inscrições: ${selectedWindow.registrations}`,
      `Logs: ${selectedWindow.logs}`,
      `Erros: ${selectedWindow.errors} (${errorRate.toFixed(1)}%)`,
      `Latência média: ${formatDuration(selectedWindow.avgDurationMs)} · P95 ${formatDuration(selectedWindow.p95DurationMs)}`,
      summary?.generatedAt ? `Atualizado em ${formatDateTime(summary.generatedAt)}` : "",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Resumo copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  function getGreeting() {
    if (!mounted) return "Olá";
    const hour = new Date(now).getHours();
    if (hour < 6) return "Boa madrugada";
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }
  const greeting = `${getGreeting()}, ${user.username}`;
  const relativeOf = (iso: string) => (mounted ? formatRelative(iso) : "");

  const slowCount = summary?.slowRequests.length ?? 0;
  const overallHealth = (() => {
    if (!hasSummary) return { label: "Sem dados", tone: "border-muted/40 bg-muted/20 text-muted-foreground", dotTone: "bg-muted-foreground/50" };
    if (errorRate >= 5 || slowCount >= 5) return { label: "Atenção crítica", tone: "border-rose-500/30 bg-rose-500/10 text-rose-400", dotTone: "bg-rose-500" };
    if (errorRate >= 1 || slowCount >= 2) return { label: "Monitorando", tone: "border-amber-500/30 bg-amber-500/10 text-amber-400", dotTone: "bg-amber-500" };
    return { label: "Operação estável", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", dotTone: "bg-emerald-500" };
  })();

  function trendOf(values: number[]) {
    if (values.length < 4) return null;
    const half = Math.floor(values.length / 2);
    const first = values.slice(0, half).reduce((a, b) => a + b, 0);
    const second = values.slice(half).reduce((a, b) => a + b, 0);
    if (first === 0 && second === 0) return null;
    if (first === 0) return { dir: "up" as const, pct: 100 };
    const diff = ((second - first) / first) * 100;
    if (Math.abs(diff) < 1) return null;
    return { dir: (diff > 0 ? "up" : "down") as "up" | "down", pct: Math.abs(diff) };
  }
  const trendRegistrations = trendOf(sparkRegistrations);
  const trendLogs = trendOf(sparkLogs);
  const trendErrors = trendOf(sparkErrors);
  const trendLatency = trendOf(sparkLatency);

  // Distribuição de status codes
  const statusDistribution = { ok: 0, redirect: 0, clientError: 0, serverError: 0 };
  for (const log of [...(summary?.recentLogs ?? []), ...(summary?.slowRequests ?? [])]) {
    if (log.status >= 500) statusDistribution.serverError += 1;
    else if (log.status >= 400) statusDistribution.clientError += 1;
    else if (log.status >= 300) statusDistribution.redirect += 1;
    else if (log.status >= 200) statusDistribution.ok += 1;
  }
  const statusTotal =
    statusDistribution.ok + statusDistribution.redirect + statusDistribution.clientError + statusDistribution.serverError;

  // Top endpoints
  const endpointHits = new Map<string, { endpoint: string; method: string; count: number; errors: number }>();
  for (const log of [...(summary?.recentLogs ?? []), ...(summary?.slowRequests ?? [])]) {
    const key = `${log.method} ${log.endpoint}`;
    const entry = endpointHits.get(key) ?? { endpoint: log.endpoint, method: log.method, count: 0, errors: 0 };
    entry.count += 1;
    if (log.status >= 400) entry.errors += 1;
    endpointHits.set(key, entry);
  }
  const topEndpoints = Array.from(endpointHits.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  // Inscrições por modalidade
  const modalidadeCounts = new Map<string, number>();
  for (const item of summary?.recentRegistrations ?? []) {
    const key = item.modalidade || "Outras";
    modalidadeCounts.set(key, (modalidadeCounts.get(key) ?? 0) + 1);
  }
  const modalidadeRows = Array.from(modalidadeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const modalidadeMax = Math.max(...modalidadeRows.map(([, v]) => v), 1);

  // Insight automático
  let insight: string | null = null;
  if (selectedWindow && sparkBuckets.length > 0) {
    const totalActivity = sparkRegistrations.reduce((a, b) => a + b, 0) + sparkLogs.reduce((a, b) => a + b, 0);
    if (totalActivity === 0) {
      insight = "Sem atividade registrada no período.";
    } else {
      let peakIndex = 0;
      let peakValue = -1;
      sparkBuckets.forEach((b, i) => {
        const v = b.registrations + b.logs;
        if (v > peakValue) {
          peakValue = v;
          peakIndex = i;
        }
      });
      const peakLabel = sparkBuckets[peakIndex]?.label;
      if (peakLabel) {
        insight = `Maior atividade em ${formatTimeLabel(peakLabel)} · ${formatCount(peakValue)} eventos.`;
      }
    }
  }

  function tendencyWord(trend: { dir: "up" | "down"; pct: number } | null) {
    if (!trend) return "estável";
    if (trend.pct < 5) return "estável";
    return trend.dir === "up" ? "subindo" : "caindo";
  }

  const lastRegistrationAt = summary?.recentRegistrations[0]?.createdAt ?? null;
  const lastLogAt = summary?.recentLogs[0]?.occurredAt ?? null;

  const narrative = (() => {
    if (!selectedWindow) return null;
    const partes: string[] = [];
    partes.push(`${formatCount(selectedWindow.registrations)} inscrições`);
    partes.push(`${formatCount(selectedWindow.logs)} requisições`);
    if (selectedWindow.errors > 0) partes.push(`${selectedWindow.errors} erros (${errorRate.toFixed(1)}%)`);
    partes.push(`latência média ${formatDuration(selectedWindow.avgDurationMs)}`);
    const reg = tendencyWord(trendRegistrations);
    const err = tendencyWord(trendErrors);
    return `Nas ${rangeFullLabel}: ${partes.join(" · ")}. Inscrições ${reg}, erros ${err}.`;
  })();

  function handleShareView() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("range", selectedRange);
    navigator.clipboard.writeText(url.toString()).then(
      () => toast.success("Link copiado."),
      () => toast.error("Não foi possível copiar o link."),
    );
  }

  // Pico para anotação no chart
  const peakBucketIndex = (() => {
    if (!sparkBuckets.length) return -1;
    let idx = 0;
    let max = -1;
    sparkBuckets.forEach((b, i) => {
      const v = b.registrations + b.logs;
      if (v > max) { max = v; idx = i; }
    });
    return max > 0 ? idx : -1;
  })();

  const healthSub =
    overallHealth.label === "Operação estável"
      ? "Todos os sistemas dentro dos parâmetros normais."
      : overallHealth.label === "Monitorando"
        ? "Algumas métricas exigem acompanhamento."
        : overallHealth.label === "Atenção crítica"
          ? "Erros ou latência acima do tolerável."
          : "Aguardando dados do período.";

  const hasRecentError = (summary?.recentLogs ?? []).some((l) => isItemNew(l.occurredAt));

  return (
    <TooltipProvider delay={120}>
    <div
      className={cn(
        "flex flex-col transition-opacity duration-200",
        density === "compact" ? "gap-4 text-[13px]" : "gap-6",
        isPending && "pointer-events-none opacity-60",
      )}
      aria-busy={isPending}
    >
      {/* Top bar minimalista estilo Cloudflare */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
        <div className="min-w-0 space-y-1.5">
          <Breadcrumb
            items={[
              { label: "Início", href: "/home", icon: LayoutDashboardIcon },
              { label: "Dashboard" },
            ]}
          />
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Dashboard operacional
          </h1>
          <p className="text-xs text-muted-foreground">{healthSub}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Intervalo do período"
            className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-background/50 p-0.5"
          >
            {rangeOptions.map((option) => {
              const active = selectedRange === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedRange(option.key)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))}
            aria-label="Alternar densidade"
            title="Alternar densidade"
            className="size-8 rounded-md text-[10px] font-semibold"
          >
            {density === "compact" ? "C+" : "C"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleShareView}
            aria-label="Compartilhar"
            title="Copiar link com filtros atuais"
            className="size-8 rounded-md"
          >
            <ExternalLinkIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setFocusMode((v) => !v)}
            aria-label="Modo focado"
            title={focusMode ? "Sair do modo focado" : "Modo focado"}
            className="size-8 rounded-md"
          >
            <LayoutDashboardIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isPending}
            aria-label="Atualizar (R)"
            title="Atualizar dashboard · R"
            className="group/refresh-dash relative size-8 rounded-md"
          >
            {isPending ? <Spinner size="sm" /> : <RefreshCcwIcon className="size-3.5 transition-transform duration-300 group-hover/refresh-dash:rotate-90" />}
            {hasRecentError && !isPending ? (
              <span className="absolute -top-0.5 -right-0.5 flex size-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full border border-background bg-rose-500" />
              </span>
            ) : null}
          </Button>
        </div>
      </header>

      {/* Status row inline */}
      <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium uppercase tracking-wider text-emerald-400">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          Em tempo real
        </span>
        <span
          className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium", overallHealth.tone)}
          title="Saúde estimada da operação"
        >
          <span className={cn("size-1.5 rounded-full", overallHealth.dotTone)} />
          {isFresh ? "Sincronizado agora" : overallHealth.label}
        </span>
        {updatedAgo ? (
          <span
            className="inline-flex items-center gap-1 text-muted-foreground"
            title={summary ? formatDateTime(summary.generatedAt) : undefined}
          >
            <ClockIcon className="size-3" />
            {updatedAgo}
          </span>
        ) : null}
        {timezoneShort ? (
          <span className="hidden text-muted-foreground sm:inline" title={`Fuso horário: ${timezone}`}>
            {timezoneShort}
          </span>
        ) : null}
        <span className="hidden text-muted-foreground/50 sm:inline">·</span>
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={lastRegistrationAt ? formatDateTime(lastRegistrationAt) : "Sem inscrições recentes"}
        >
          <InboxIcon className="size-3 text-emerald-400" />
          <span>Inscrição: {lastRegistrationAt ? relativeOf(lastRegistrationAt) : "—"}</span>
        </span>
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={lastLogAt ? formatDateTime(lastLogAt) : "Sem erros recentes"}
        >
          <OctagonXIcon className="size-3 text-rose-400" />
          <span>Erro: {lastLogAt ? relativeOf(lastLogAt) : "—"}</span>
        </span>
      </div>

      {/* Section: Análise de dados — 3 cards multi-KPI */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-base font-semibold tracking-tight">Análise de dados</h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{rangeFullLabel}</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {/* Catálogo */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="border-b border-border/40 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <LayoutGridIcon className="size-4 text-primary" />
                Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projetos</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                    <AnimatedNumber value={totalProjects} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">{liveProjects} ativos</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Com SSO</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                    <AnimatedNumber value={ssoProjects} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {totalProjects ? `${Math.round((ssoProjects / totalProjects) * 100)}%` : "—"} do total
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Destaques</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-amber-400">
                    <AnimatedNumber value={featuredProjects.length} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">priorizados</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
                    <AnimatedNumber value={betaProjects} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pilotProjects} piloto</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="border-b border-border/40 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ActivityIcon className="size-4 text-muted-foreground" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxa de erro</p>
                  <p className={cn("mt-0.5 flex items-baseline gap-2 text-2xl font-semibold tabular-nums", getErrorRateColor(errorRate))}>
                    {errorRate.toFixed(errorRate >= 10 ? 0 : 1)}%
                    <TrendBadge trend={trendErrors} invert />
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedWindow ? `${formatCount(selectedWindow.errors)}/${formatCount(selectedWindow.logs)} reqs` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latência média</p>
                  <p className="mt-0.5 flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
                    {selectedWindow ? formatDuration(selectedWindow.avgDurationMs) : "—"}
                    <TrendBadge trend={trendLatency} invert />
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    P95 {selectedWindow ? formatDuration(selectedWindow.p95DurationMs) : "—"}
                  </p>
                </div>
              </div>
              {sparkLatency.some((v) => v > 0) ? (
                <Sparkline data={sparkLatency} className="text-muted-foreground opacity-80" />
              ) : (
                <div className="h-6 rounded bg-muted/20" />
              )}
            </CardContent>
          </Card>

          {/* Atividade */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="border-b border-border/40 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ZapIcon className="size-4 text-emerald-400" />
                Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inscrições</p>
                  <p className="mt-0.5 flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
                    {selectedWindow ? formatCount(selectedWindow.registrations) : "—"}
                    <TrendBadge trend={trendRegistrations} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">tendência {tendencyWord(trendRegistrations)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requisições</p>
                  <p className="mt-0.5 flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
                    {selectedWindow ? formatCount(selectedWindow.logs) : "—"}
                    <TrendBadge trend={trendLogs} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">tendência {tendencyWord(trendLogs)}</p>
                </div>
              </div>
              {sparkLogs.some((v) => v > 0) ? (
                <Sparkline data={sparkLogs} className="text-emerald-400 opacity-80" />
              ) : (
                <div className="h-6 rounded bg-muted/20" />
              )}
            </CardContent>
          </Card>
        </div>

        {narrative ? (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground/85">
            <span className="font-semibold text-primary">Resumo:</span> {narrative}
          </p>
        ) : null}
      </section>

      {/* Section: Tráfego — charts */}
      {hasSummary && selectedWindow ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-base font-semibold tracking-tight">Tráfego</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                title="Copiar resumo"
              >
                <ClipboardIcon className="size-3" />
                Copiar
              </button>
              <span className="text-muted-foreground/50">·</span>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                title="Exportar CSV"
              >
                <ArrowDownIcon className="size-3" />
                CSV
              </button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/40 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">Inscrições e erros</CardTitle>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Inscrições
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      Erros
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TimelineBars
                  data={selectedWindow.buckets}
                  accentClass="bg-emerald-400/90"
                  errorClass="bg-rose-500/90"
                  peakIndex={peakBucketIndex}
                />
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/40 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">Tempo de resposta</CardTitle>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Méd. {formatDuration(selectedWindow.avgDurationMs)}</span>
                    <span>P95 {formatDuration(selectedWindow.p95DurationMs)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TimelineLine data={selectedWindow.buckets} strokeClass="text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
          {insight ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5 text-primary/70" />
              {insight}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Section: Recentes — 3 cards lado a lado */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">Recentes</h2>
        <div className={cn("grid gap-3", focusMode ? "lg:grid-cols-3" : "lg:grid-cols-3")}>
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border/40 py-3">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-medium">Últimas inscrições</CardTitle>
                <CardDescription className="text-[11px]">Entradas mais recentes da base.</CardDescription>
              </div>
              <Link href="/vct/inscricoes" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80">
                Ver tudo <ChevronRightIcon className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {summary?.recentRegistrations.length ? (
                summary.recentRegistrations.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex animate-in fade-in slide-in-from-bottom-1 items-center justify-between gap-2 rounded-lg border bg-background/50 px-2.5 py-1.5 transition-colors hover:border-border hover:bg-background",
                      isItemNew(item.createdAt) ? "border-emerald-500/40" : "border-border/50",
                    )}
                    style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <InitialAvatar name={item.nome} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{item.nome}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.nick} · {item.modalidade}
                        </p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-[10px] text-muted-foreground"
                      title={formatDateTime(item.createdAt)}
                    >
                      {isItemNew(item.createdAt) ? (
                        <span className="mr-1 inline-flex items-center rounded-full bg-emerald-500/20 px-1 text-[9px] font-semibold uppercase text-emerald-300">
                          Novo
                        </span>
                      ) : null}
                      {relativeOf(item.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState icon={InboxIcon} title="Nenhuma inscrição" description="Aparecerão aqui quando chegarem." />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border/40 py-3">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-medium">Erros recentes</CardTitle>
                <div className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background/50 p-0.5 text-[10px]">
                  {[
                    { key: "all" as const, label: "Todos" },
                    { key: "client" as const, label: "4xx" },
                    { key: "server" as const, label: "5xx" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium uppercase transition-colors",
                        statusFilter === f.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <Link href="/logs" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80">
                Logs <ChevronRightIcon className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {(() => {
                const filteredLogs = (summary?.recentLogs ?? []).filter((l) => {
                  if (statusFilter === "client") return l.status >= 400 && l.status < 500;
                  if (statusFilter === "server") return l.status >= 500;
                  return true;
                });
                return filteredLogs.length ? (
                  filteredLogs.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-1 rounded-lg border bg-background/50 px-2.5 py-1.5 transition-colors hover:border-border hover:bg-background",
                        isItemNew(item.occurredAt) ? "border-rose-500/40" : "border-border/50",
                      )}
                      style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">{item.projectName}</p>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground" title={formatDateTime(item.occurredAt)}>
                          {relativeOf(item.occurredAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <MethodPill method={item.method} />
                        <StatusPill status={item.status} />
                        <span className="truncate font-mono text-[10px] text-muted-foreground">{item.endpoint}</span>
                      </div>
                    </div>
                  ))
                ) : selectedWindow && selectedWindow.logs > 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                    <ShieldCheckIcon className="size-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300">Sem erros</p>
                      <p className="text-[10px] text-emerald-200/70">{formatCount(selectedWindow.logs)} reqs sem falha.</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={OctagonXIcon} title="Sem erros" description="Nenhum erro registrado." />
                );
              })()}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-border/40 py-3">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-medium">Requisições lentas</CardTitle>
                <CardDescription className="text-[11px]">Latência mais alta no período.</CardDescription>
              </div>
              <Link href="/logs" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80">
                Logs <ChevronRightIcon className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              {summary?.slowRequests.length ? (
                summary.slowRequests.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 transition-colors hover:border-border hover:bg-background">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-medium text-foreground">{item.projectName}</p>
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tabular-nums">
                        {formatDuration(item.durationMs)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <MethodPill method={item.method} />
                      <StatusPill status={item.status} />
                      <span className="truncate font-mono text-[10px] text-muted-foreground">{item.endpoint}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={ZapIcon} title="Tudo OK" description="Sem requisições lentas." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section: Insights — colunas densas */}
      {focusMode ? null : (
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">Insights</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Saúde do portal */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="border-b border-border/40 py-3">
              <CardTitle className="text-sm font-medium">Saúde do portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-3">
              {[
                { label: "Projetos", value: totalProjects, dotClass: "bg-muted-foreground/50" },
                { label: "Live", value: liveProjects, dotClass: "bg-emerald-500" },
                { label: "Piloto", value: pilotProjects, dotClass: "bg-amber-500" },
                { label: "Beta", value: betaProjects, dotClass: "bg-foreground/40" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded border border-border/40 bg-background/40 px-2.5 py-1.5 text-xs"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", row.dotClass)} aria-hidden />
                    {row.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-foreground">{formatCount(row.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Distribuição de status */}
          {statusTotal > 0 ? (
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/40 py-3">
                <CardTitle className="text-sm font-medium">Distribuição de status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/30">
                  <div className="bg-emerald-500" style={{ width: `${(statusDistribution.ok / statusTotal) * 100}%` }} />
                  <div className="bg-sky-500" style={{ width: `${(statusDistribution.redirect / statusTotal) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(statusDistribution.clientError / statusTotal) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(statusDistribution.serverError / statusTotal) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {[
                    { label: "2xx", value: statusDistribution.ok, dot: "bg-emerald-500" },
                    { label: "3xx", value: statusDistribution.redirect, dot: "bg-sky-500" },
                    { label: "4xx", value: statusDistribution.clientError, dot: "bg-amber-500" },
                    { label: "5xx", value: statusDistribution.serverError, dot: "bg-rose-500" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn("size-1.5 rounded-full", row.dot)} aria-hidden />
                        {row.label}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Top endpoints */}
          {topEndpoints.length > 0 ? (
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/40 py-3">
                <CardTitle className="text-sm font-medium">Top endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-3">
                {(() => {
                  const max = Math.max(...topEndpoints.map((e) => e.count), 1);
                  return topEndpoints.map((entry) => {
                    const pct = (entry.count / max) * 100;
                    const errPct = entry.count > 0 ? Math.min(100, (entry.errors / entry.count) * 100) : 0;
                    return (
                      <div key={`${entry.method} ${entry.endpoint}`} className="rounded border border-border/40 bg-background/40 px-2.5 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <MethodPill method={entry.method} />
                            <span className="truncate font-mono text-[11px] text-foreground">{entry.endpoint}</span>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {entry.count}
                            {entry.errors > 0 ? <span className="ml-1 text-rose-400">·{entry.errors}!</span> : null}
                          </span>
                        </div>
                        <div className="mt-1 flex h-0.5 w-full overflow-hidden rounded-full bg-muted/40">
                          <div className="h-full bg-emerald-500/70" style={{ width: `${pct - (pct * errPct) / 100}%` }} />
                          <div className="h-full bg-rose-500/80" style={{ width: `${(pct * errPct) / 100}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          ) : null}

          {/* Por modalidade */}
          {modalidadeRows.length > 0 ? (
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/40 py-3">
                <CardTitle className="text-sm font-medium">Por modalidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {modalidadeRows.map(([modalidade, count]) => {
                  const pct = (count / modalidadeMax) * 100;
                  return (
                    <div key={modalidade} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground">{modalidade}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {/* Projetos com mais logs */}
          {projectHealth.length > 0 ? (
            <Card className="border-border/60 bg-card/80 lg:col-span-2">
              <CardHeader className="border-b border-border/40 py-3">
                <CardTitle className="text-sm font-medium">Projetos com mais logs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {projectHealth.map((project) => {
                  const total = Math.max(project.totalLogs, 1);
                  const errorPct = Math.min(100, (project.errorLogs / total) * 100);
                  const okPct = 100 - errorPct;
                  const healthDot = errorPct >= 5 ? "bg-rose-500" : errorPct >= 1 ? "bg-amber-500" : "bg-emerald-500";
                  const critical = errorPct >= 5;
                  return (
                    <div
                      key={project.id}
                      className={cn(
                        "rounded border bg-background/40 px-2.5 py-1.5",
                        critical ? "border-rose-500/40 ring-1 ring-rose-500/20" : "border-border/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", healthDot)} aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{project.name}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {formatCount(project.totalLogs)} logs · {formatCount(project.errorLogs)} erros
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatDuration(project.avgDurationMs)}</p>
                          <p className="text-[10px] text-muted-foreground" title={project.latestAt ? formatDateTime(project.latestAt) : undefined}>
                            {project.latestAt ? relativeOf(project.latestAt) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-muted/40">
                        <div className="h-full bg-emerald-500/70" style={{ width: `${okPct}%` }} />
                        <div className="h-full bg-rose-500/80" style={{ width: `${errorPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
        <span>Universal Home · Santos Tech</span>
        <nav className="flex flex-wrap items-center gap-3">
          <Link href="/projects" className="transition-colors hover:text-foreground">Projetos</Link>
          <span className="opacity-40">·</span>
          <Link href="/logs" className="transition-colors hover:text-foreground">Logs</Link>
          <span className="opacity-40">·</span>
          <Link href="/admin/users" className="transition-colors hover:text-foreground">Admin</Link>
        </nav>
      </footer>
    </div>
    </TooltipProvider>
  );
}
