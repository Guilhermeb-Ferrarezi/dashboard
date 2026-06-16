"use client";

import { useMemo } from "react";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { SocialNav } from "@/components/social/social-nav";
import {
  MOCK_POSTS,
  PILLAR_COLORS,
  PLATFORM_DOT,
  PLATFORMS,
  PILLARS,
  STATUS_COLORS,
  STATUS_ORDER,
  type ContentPillar,
  type Platform,
  type PostStatus,
} from "@/components/social/social-mock-data";
import { cn } from "@/lib/utils";

const TODAY = "2026-06-16";
const CURRENT_MONTH = "2026-06";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function SocialResumo() {
  const thisMonthPosts = useMemo(
    () => MOCK_POSTS.filter((p) => p.scheduledDate.startsWith(CURRENT_MONTH)),
    [],
  );

  const published = thisMonthPosts.filter((p) => p.status === "Publicado").length;
  const inProgress = thisMonthPosts.filter((p) =>
    ["Em produção", "Em revisão", "Aprovado", "Agendado"].includes(p.status),
  ).length;
  const planned = thisMonthPosts.filter((p) => p.status === "Planejado").length;

  const byPlatform = useMemo(() => {
    const counts: Partial<Record<Platform, number>> = {};
    for (const post of thisMonthPosts) {
      counts[post.platform] = (counts[post.platform] ?? 0) + 1;
    }
    return PLATFORMS.map((p) => ({ platform: p, count: counts[p] ?? 0 })).filter(
      (x) => x.count > 0,
    );
  }, [thisMonthPosts]);

  const byPillar = useMemo(() => {
    const counts: Partial<Record<ContentPillar, number>> = {};
    for (const post of thisMonthPosts) {
      counts[post.pillar] = (counts[post.pillar] ?? 0) + 1;
    }
    return PILLARS.map((p) => ({ pillar: p, count: counts[p] ?? 0 })).filter(
      (x) => x.count > 0,
    );
  }, [thisMonthPosts]);

  const byStatus = useMemo(() => {
    const counts: Partial<Record<PostStatus, number>> = {};
    for (const post of thisMonthPosts) {
      counts[post.status] = (counts[post.status] ?? 0) + 1;
    }
    return STATUS_ORDER.map((s) => ({ status: s, count: counts[s] ?? 0 })).filter(
      (x) => x.count > 0,
    );
  }, [thisMonthPosts]);

  const upcoming = useMemo(
    () =>
      MOCK_POSTS.filter(
        (p) => p.scheduledDate >= TODAY && p.status !== "Arquivado",
      )
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .slice(0, 7),
    [],
  );

  return (
    <div>
      <SocialNav />

      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={CalendarIcon}
            iconTone="bg-primary/10 text-primary"
            label="Total — junho"
            value={thisMonthPosts.length}
            hint="posts planejados no mês"
          />
          <StatCard
            icon={CheckIcon}
            iconTone="bg-teal-500/10 text-teal-400"
            label="Publicados"
            value={published}
            hint="já no ar"
          />
          <StatCard
            icon={ZapIcon}
            iconTone="bg-amber-500/10 text-amber-400"
            label="Em andamento"
            value={inProgress}
            hint="produção, revisão, agendado"
          />
          <StatCard
            icon={SparklesIcon}
            iconTone="bg-zinc-500/10 text-zinc-400"
            label="Planejados"
            value={planned}
            hint="aguardando início"
          />
        </div>

        {/* Próximas entregas + breakdowns */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Próximas entregas */}
          <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="border-b border-border/40 px-4 py-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                Próximas entregas
              </p>
            </div>
            <div className="divide-y divide-border/30">
              {upcoming.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <span className="shrink-0 mt-0.5 text-xs text-muted-foreground tabular-nums w-14">
                    {formatDate(post.scheduledDate)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{post.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                          STATUS_COLORS[post.status],
                        )}
                      >
                        {post.status}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span
                      className={cn("size-2 rounded-full shrink-0", PLATFORM_DOT[post.platform])}
                    />
                    <span className="text-[11px] text-muted-foreground">{post.platform}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdowns */}
          <div className="space-y-4">
            {/* Por plataforma */}
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Por plataforma
              </p>
              <div className="space-y-2">
                {byPlatform
                  .sort((a, b) => b.count - a.count)
                  .map(({ platform, count }) => (
                    <div key={platform} className="flex items-center gap-2">
                      <span
                        className={cn("size-2 rounded-full shrink-0", PLATFORM_DOT[platform])}
                      />
                      <span className="flex-1 text-xs text-foreground truncate">{platform}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Por pilar */}
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Por pilar
              </p>
              <div className="space-y-2">
                {byPillar
                  .sort((a, b) => b.count - a.count)
                  .map(({ pillar, count }) => (
                    <div key={pillar} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                          PILLAR_COLORS[pillar],
                        )}
                      >
                        {pillar}
                      </span>
                      <span className="flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Por status */}
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Por status
              </p>
              <div className="space-y-2">
                {byStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px] h-4 px-1.5 border",
                        STATUS_COLORS[status],
                      )}
                    >
                      {status}
                    </Badge>
                    <span className="flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
