"use client";

import { useMemo } from "react";
import { SocialNav } from "@/components/social/social-nav";
import {
  MOCK_POSTS,
  PILLAR_COLORS,
  PLATFORM_COLORS,
  PLATFORM_DOT,
  STATUS_COLORS,
  STATUS_ORDER,
  type PostStatus,
} from "@/components/social/social-mock-data";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function SocialKanban() {
  const columns = useMemo(() => {
    const map: Record<PostStatus, typeof MOCK_POSTS> = {
      Planejado: [],
      "Em produção": [],
      "Em revisão": [],
      Aprovado: [],
      Agendado: [],
      Publicado: [],
      Arquivado: [],
    };
    for (const post of MOCK_POSTS) {
      map[post.status].push(post);
    }
    return STATUS_ORDER.map((status) => ({
      status,
      posts: map[status].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    }));
  }, []);

  return (
    <div>
      <SocialNav />

      <div className="overflow-x-auto -mx-[var(--card-padding-x)]">
        <div className="flex gap-3 px-[var(--card-padding-x)] pb-2 min-w-max">
          {columns.map(({ status, posts }) => (
            <div key={status} className="w-60 shrink-0 flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-2 py-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                    STATUS_COLORS[status],
                  )}
                >
                  {status}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {posts.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[80px]">
                {posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/30 h-16 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/40">vazio</span>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-xl border border-border/40 bg-card p-3 space-y-2"
                    >
                      <p className="text-sm text-foreground leading-snug line-clamp-2">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                            PLATFORM_COLORS[post.platform],
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              PLATFORM_DOT[post.platform],
                            )}
                          />
                          {post.platform}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                            PILLAR_COLORS[post.pillar],
                          )}
                        >
                          {post.pillar}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(post.scheduledDate)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
