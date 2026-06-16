"use client";

import { useMemo, useState } from "react";
import { SearchIcon, SlidersHorizontalIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SocialNav } from "@/components/social/social-nav";
import {
  MOCK_POSTS,
  PILLAR_COLORS,
  PILLARS,
  PLATFORM_COLORS,
  PLATFORM_DOT,
  PLATFORMS,
  STATUS_COLORS,
  STATUS_ORDER,
  type ContentPillar,
  type Platform,
  type PostStatus,
} from "@/components/social/social-mock-data";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

type FilterOption<T extends string> = T | "Todos";

export function SocialLista() {
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<FilterOption<Platform>>("Todos");
  const [filterPillar, setFilterPillar] = useState<FilterOption<ContentPillar>>("Todos");
  const [filterStatus, setFilterStatus] = useState<FilterOption<PostStatus>>("Todos");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return MOCK_POSTS.filter((post) => {
      if (filterPlatform !== "Todos" && post.platform !== filterPlatform) return false;
      if (filterPillar !== "Todos" && post.pillar !== filterPillar) return false;
      if (filterStatus !== "Todos" && post.status !== filterStatus) return false;
      if (q) {
        const haystack = post.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [search, filterPlatform, filterPillar, filterStatus]);

  return (
    <div>
      <SocialNav />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48 max-w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar post..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <SlidersHorizontalIcon className="size-3.5 text-muted-foreground shrink-0" />

        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as FilterOption<Platform>)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="Todos">Plataforma: Todas</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filterPillar}
          onChange={(e) => setFilterPillar(e.target.value as FilterOption<ContentPillar>)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="Todos">Pilar: Todos</option>
          {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterOption<PostStatus>)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="Todos">Status: Todos</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {(filterPlatform !== "Todos" || filterPillar !== "Todos" || filterStatus !== "Todos" || search) && (
          <button
            type="button"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setFilterPlatform("Todos"); setFilterPillar("Todos"); setFilterStatus("Todos"); setSearch(""); }}
          >
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} post{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5 w-28">
                Data
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5">
                Título
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                Plataforma
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5 hidden md:table-cell">
                Pilar
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum post encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              filtered.map((post) => (
                <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDate(post.scheduledDate)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-foreground">
                    <span className="line-clamp-1">{post.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 sm:hidden">
                      <span className={cn("size-1.5 rounded-full", PLATFORM_DOT[post.platform])} />
                      <span className="text-[10px] text-muted-foreground">{post.platform}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                        PLATFORM_COLORS[post.platform],
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", PLATFORM_DOT[post.platform])} />
                      {post.platform}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                        PILLAR_COLORS[post.pillar],
                      )}
                    >
                      {post.pillar}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                        STATUS_COLORS[post.status],
                      )}
                    >
                      {post.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
