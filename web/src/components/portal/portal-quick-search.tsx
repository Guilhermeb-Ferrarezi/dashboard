"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SearchIcon, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { clientApi } from "@/lib/api";
import type { SessionUser } from "@/lib/session";
import type { LogsProject } from "@/types/logs";
import type { PortalProject, PortalUserSummary } from "@/types/portal";
import {
  buildPortalSearchText,
  buildPortalSidebarGroups,
  normalizePortalText,
  portalIconMap,
} from "@/components/portal/portal-shell-data";
import {
  dispatchPortalQuickSearchOpen,
  listenPortalQuickSearchOpen,
  readPortalRecents,
  trackPortalRecent,
} from "@/components/portal/portal-recents";

type SearchResult = {
  id: string;
  label: string;
  description: string;
  value: string;
  group: string;
  contextPath: string;
  breadcrumb: string;
  kind: "group" | "page" | "resource" | "action";
  href?: string;
  iconKey: keyof typeof portalIconMap;
  action?: () => Promise<void> | void;
};

const MAX_VISIBLE_RESULTS = 6;

function openPortalQuickSearch() {
  dispatchPortalQuickSearchOpen();
}

function getSearchKindPriority(kind: SearchResult["kind"]) {
  if (kind === "group") return 0;
  if (kind === "page") return 1;
  if (kind === "resource") return 2;
  return 3;
}

function buildGroupSearchText(group: { label: string; items: { label: string; description: string; keywords: string[]; children?: { label: string; description: string; keywords: string[] }[] }[] }) {
  return normalizePortalText(
    [
      group.label,
      ...group.items.flatMap((item) => [
        item.label,
        item.description,
        item.keywords.join(" "),
        ...(item.children ?? []).flatMap((child) => [
          child.label,
          child.description,
          child.keywords.join(" "),
        ]),
      ]),
    ].join(" "),
  );
}

function scoreSearchResult(item: SearchResult, query: string) {
  if (!query) {
    return 1000 - getSearchKindPriority(item.kind) * 100;
  }

  const normalizedLabel = normalizePortalText(item.label);
  const normalizedValue = normalizePortalText(item.value);
  const normalizedContextPath = normalizePortalText(item.contextPath);

  if (normalizedLabel === query) return 1000;
  if (normalizedLabel.startsWith(query)) return 900;
  if (normalizedValue.startsWith(query)) return 800;
  if (normalizedLabel.includes(query)) return 700;
  if (normalizedValue.includes(query)) return 600;
  if (normalizedContextPath.includes(query)) return 500;

  return 0;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
  const parts = text.split(regex);
  const normalizedNeedle = normalizePortalText(normalizedQuery);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        normalizePortalText(part) === normalizedNeedle ? (
          <span key={`${part}-${index}`} className="rounded bg-amber-500/20 px-0.5 text-amber-300">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}

function getSearchDisplayText(result: SearchResult) {
  if (result.breadcrumb.includes(" > ")) {
    return result.breadcrumb;
  }

  return result.label;
}

export function buildStaticSearchResults(logsHref: string): SearchResult[] {
  return buildPortalSidebarGroups(logsHref).flatMap((group) => {
    const groupItems = group.items.flatMap((item) => [item, ...(item.children ?? [])]);

    return [
      {
        id: `group:${group.label}`,
        label: group.label,
        description: `${groupItems.length} itens na sidebar`,
        value: buildGroupSearchText(group),
        group: "Grupos",
        contextPath: group.label,
        breadcrumb: group.label,
        kind: "group",
        href: groupItems[0]?.href,
        iconKey: "sparkles",
      } satisfies SearchResult,
      ...group.items.flatMap((item) => [
        ...(item.href === "/profile"
          ? []
          : [
              {
                id: item.href,
                label: item.label,
                description: item.description,
                value: buildPortalSearchText(item),
                group: `${group.label}`,
                contextPath: group.label,
                breadcrumb: item.label,
                kind: item.kind === "page" ? "page" : "resource",
                href: item.href,
                iconKey: resolveIconKey(item.icon),
              } satisfies SearchResult,
            ]),
        ...(item.children ?? []).map((child) => ({
          id: child.href,
          label: child.label,
          description: child.description,
          value: buildPortalSearchText(child),
          group: `${group.label} / ${item.label}`,
          contextPath: `${group.label} / ${item.label}`,
          breadcrumb: `${item.label} > ${child.label}`,
          kind: child.kind === "page" ? "page" : "resource",
          href: child.href,
          iconKey: resolveIconKey(item.icon),
        } satisfies SearchResult)),
      ]),
    ];
  });
}

function resolveIconKey(icon: LucideIcon): keyof typeof portalIconMap {
  if (icon === portalIconMap.home) return "home";
  if (icon === portalIconMap.logs) return "logs";
  if (icon === portalIconMap.users) return "users";
  if (icon === portalIconMap.account) return "account";
  if (icon === portalIconMap.vct) return "vct";
  return "sparkles";
}

function buildActionResults(
  router: ReturnType<typeof useRouter>,
  currentPathname: string,
  setTheme: (theme: string) => void,
): SearchResult[] {
  return [
    {
      id: "open-home",
      label: "Abrir home",
      description: "Ir para o launcher principal",
      value: "abrir home launcher principal",
      group: "Acoes",
      contextPath: "Acoes",
      breadcrumb: "Abrir home",
      kind: "action",
      iconKey: "home",
      action: () => router.push("/home"),
    },
    {
      id: "copy-link",
      label: "Copiar link",
      description: "Copiar o endereco desta pagina",
      value: "copiar link endereco pagina",
      group: "Acoes",
      contextPath: "Acoes",
      breadcrumb: "Copiar link",
      kind: "action",
      iconKey: "link",
      action: async () => {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado.");
      },
    },
    {
      id: "copy-path",
      label: "Copiar rota atual",
      description: currentPathname,
      value: `copiar rota atual ${currentPathname}`,
      group: "Acoes",
      contextPath: "Acoes",
      breadcrumb: "Copiar rota atual",
      kind: "action",
      iconKey: "link",
      action: async () => {
        await navigator.clipboard.writeText(currentPathname);
        toast.success("Rota copiada.");
      },
    },
    {
      id: "toggle-theme",
      label: "Alternar tema",
      description: "Trocar entre claro e escuro",
      value: "alternar tema claro escuro",
      group: "Acoes",
      contextPath: "Acoes",
      breadcrumb: "Alternar tema",
      kind: "action",
      iconKey: "sparkles",
      action: () => {
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
      },
    },
  ];
}

function mapPortalProjects(projects: PortalProject[], userId: string): SearchResult[] {
  return projects.map((project) => ({
    id: `project:${project.id}`,
    label: project.name,
    description: `${project.category} · ${project.audience}`,
    value: [project.name, project.description, project.category, project.audience, ...project.tags].join(" "),
    group: "Projetos",
    contextPath: "Projetos",
    breadcrumb: project.name,
    kind: "resource",
    iconKey: "sparkles",
    action: async () => {
      trackPortalRecent(userId, {
        id: `project:${project.id}`,
        href: project.url,
        label: project.name,
        description: `${project.category} · ${project.audience}`,
        group: "Projetos",
        iconKey: "sparkles",
        kind: "resource",
      });

      try {
        if (project.ssoMode === "shared-ticket") {
          const response = await clientApi<{ redirectUrl: string }>(`/sso/${project.id}/start`, {
            method: "POST",
          });
          window.location.assign(response.redirectUrl);
          return;
        }

        window.location.assign(project.url);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Nao foi possivel abrir o projeto.",
        );
      }
    },
  }));
}

function mapPortalUsers(users: PortalUserSummary[]): SearchResult[] {
  return users.map((user) => ({
    id: `user:${user.id}`,
    label: user.username,
    description: user.email ?? "sem email",
    value: [user.username, user.email ?? "", user.role].join(" "),
    group: "Usuarios",
    contextPath: "Usuarios",
    breadcrumb: user.username,
    kind: "resource",
    iconKey: "users",
    href: "/admin/users",
  }));
}

export function buildLogsProjectSearchResult(project: LogsProject): SearchResult {
  return {
    id: `logs:${project.id}`,
    label: project.name,
    description: project.slug,
    value: [project.name, project.slug, project.apiKey, String(project.totalLogs ?? "")].join(" "),
    group: "Logs",
    contextPath: "Logs",
    breadcrumb: `Logs > ${project.name}`,
    kind: "resource",
    href: `/logs/${project.id}`,
    iconKey: "logs",
  };
}

function mapLogsProjects(projects: LogsProject[]): SearchResult[] {
  return projects.map((project) => buildLogsProjectSearchResult(project));
}

function mapRecentResults(recents: ReturnType<typeof readPortalRecents>): SearchResult[] {
  return recents.map((item) => ({
    id: `recent:${item.id}`,
    label: item.label,
    description: item.description,
    value: [item.label, item.description, item.group].join(" "),
    group: "Recentes",
    contextPath: "Recentes",
    breadcrumb: item.label,
    kind: "resource",
    href: item.href,
    iconKey: item.iconKey as keyof typeof portalIconMap,
  }));
}

export function filterPortalSearchResults({
  results,
  query,
}: {
  results: SearchResult[];
  query: string;
}) {
  const normalizedQuery = normalizePortalText(query).trim();

  const filteredResults = results
    .filter((item) => item.kind !== "group")
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      const normalizedValue = normalizePortalText(item.value);
      const normalizedContextPath = normalizePortalText(item.contextPath);

      return (
        normalizedValue.includes(normalizedQuery) ||
        normalizedContextPath.includes(normalizedQuery)
      );
    })
    .map((item) => ({
      item,
      score: scoreSearchResult(item, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.item.kind !== right.item.kind) {
        return getSearchKindPriority(left.item.kind) - getSearchKindPriority(right.item.kind);
      }

      return left.item.label.localeCompare(right.item.label);
    })
    .map(({ item }) => item);

  const dedupedResults: SearchResult[] = [];
  const resultIndexByHref = new Map<string, number>();

  for (const item of filteredResults) {
    const key = item.href ?? item.id;
    const existingIndex = resultIndexByHref.get(key);

    if (existingIndex === undefined) {
      resultIndexByHref.set(key, dedupedResults.length);
      dedupedResults.push(item);
      continue;
    }

    const existing = dedupedResults[existingIndex];
    const existingHasBreadcrumb = existing.breadcrumb.includes(" > ");
    const itemHasBreadcrumb = item.breadcrumb.includes(" > ");

    if (itemHasBreadcrumb && !existingHasBreadcrumb) {
      dedupedResults[existingIndex] = item;
    }
  }

  return dedupedResults.slice(0, MAX_VISIBLE_RESULTS);
}

export function PortalSearchLauncher({
  className,
  variant = "header",
}: {
  className?: string;
  variant?: "header" | "sidebar" | "compact";
}) {
  const label =
    variant === "sidebar"
      ? "Quick search..."
      : "Buscar paginas, projetos, usuarios e logs";

  return (
    <button
      type="button"
      onClick={openPortalQuickSearch}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-3 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        variant === "header" && "h-11",
        variant === "sidebar" &&
          "h-10 bg-sidebar-accent/50 text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        variant === "compact" && "h-9 max-w-[280px]",
        className,
      )}
    >
      <SearchIcon className="size-4 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>
      <kbd className="hidden shrink-0 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
        Ctrl K
      </kbd>
    </button>
  );
}

export function PortalQuickSearchDialog({
  user,
  logsHref,
}: {
  user: SessionUser;
  logsHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [users, setUsers] = useState<PortalUserSummary[]>([]);
  const [logsProjects, setLogsProjects] = useState<LogsProject[]>([]);
  const [recents, setRecents] = useState<ReturnType<typeof readPortalRecents>>([]);

  useEffect(() => {
    setRecents(readPortalRecents(user.id));
  }, [user.id]);

  useEffect(() => {
    function handleRecentsChanged() {
      setRecents(readPortalRecents(user.id));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const removeOpenListener = listenPortalQuickSearchOpen(() => setOpen(true));
    window.addEventListener("portal:recents-changed", handleRecentsChanged);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      removeOpenListener();
      window.removeEventListener("portal:recents-changed", handleRecentsChanged);
    };
  }, [user.id]);

  useEffect(() => {
    if (!open || loaded) {
      return;
    }

    let cancelled = false;

    async function loadSearchData() {
      try {
        const [projectResponse, usersResponse, logsResponse] = await Promise.all([
          clientApi<{ projects: PortalProject[] }>("/projects"),
          user.role === "admin"
            ? clientApi<{ users: PortalUserSummary[] }>("/admin/users")
            : Promise.resolve(null),
          user.role === "admin"
            ? clientApi<{ projects: LogsProject[] }>("/logs/projects")
            : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        setProjects(projectResponse.projects);
        setUsers(usersResponse?.users ?? []);
        setLogsProjects(logsResponse?.projects ?? []);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a busca global.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadSearchData();

    return () => {
      cancelled = true;
    };
  }, [loaded, open, user.role]);

  useEffect(() => {
    if (open) {
      return;
    }

    setQuery("");
  }, [open]);

  const normalizedQuery = useDeferredValue(normalizePortalText(query).trim());

  const searchResults = useMemo(() => {
    const staticResults = buildStaticSearchResults(logsHref).filter((item) => {
      if (user.role === "admin") {
        return true;
      }

      return item.group.startsWith("Operacao") || item.group.startsWith("Jogos");
    }).filter((item) => item.kind !== "group");
    const dynamicResults = [
      ...mapPortalProjects(projects, user.id),
      ...(user.role === "admin" ? mapPortalUsers(users) : []),
      ...(user.role === "admin" ? mapLogsProjects(logsProjects) : []),
      ...mapRecentResults(recents),
      ...buildActionResults(router, pathname, setTheme),
    ];

    const allResults = [...staticResults, ...dynamicResults];
    return filterPortalSearchResults({
      results: allResults,
      query: normalizedQuery,
    });
  }, [
    normalizedQuery,
    logsHref,
    logsProjects,
    pathname,
    projects,
    recents,
    router,
    setTheme,
    user.id,
    user.role,
    users,
  ]);

  const goToResults = searchResults.filter((item) => item.kind !== "action");
  const actionResults = searchResults.filter((item) => item.kind === "action");
  const askAiQuery = query.trim();
  const askAiResult = askAiQuery
    ? {
        id: "ask-ai",
        label: "Ask AI",
        description: `"${askAiQuery}"`,
        value: `ask ai ${askAiQuery}`,
        group: "Ask AI",
        contextPath: "Ask AI",
        breadcrumb: `Ask AI — "${askAiQuery}"`,
        kind: "action" as const,
        iconKey: "sparkles" as const,
        action: async () => {
          await navigator.clipboard.writeText(askAiQuery);
          toast.success("Prompt copiado.");
        },
      }
    : null;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Busca global"
      description="Pesquisar paginas, recursos e comandos do portal"
      className="!max-w-none w-[min(92vw,760px)] border border-white/10 bg-[#0b0b0b] shadow-[0_32px_96px_rgba(0,0,0,0.6)]"
    >
      <Command shouldFilter={false} className="rounded-2xl! bg-[#0b0b0b] p-0 text-zinc-100">
        <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, projects, users, logs and actions..."
              className="h-10 text-[0.95rem] text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <kbd className="mt-1 inline-flex shrink-0 items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-400">
            Esc
          </kbd>
        </div>

        <CommandList className="max-h-[min(58vh,24rem)] px-2 pb-1">
          {searchResults.length || askAiResult ? (
            <>
              {goToResults.length ? (
                <>
                  <CommandGroup heading="Go to" className="text-[0.78rem] uppercase tracking-[0.14em] text-zinc-500">
                    {goToResults.map((item) => {
                      const Icon = portalIconMap[item.iconKey];

                      return (
                        <CommandItem
                          key={item.id}
                          value={item.value}
                          onSelect={() => {
                            setOpen(false);
                            const href = item.href ?? "/home";
                            startTransition(() => {
                              router.push(href);
                            });
                          }}
                        >
                          <Icon className="size-4" />
                          <HighlightedText
                            text={getSearchDisplayText(item)}
                            query={query}
                            className="min-w-0 flex-1 truncate text-[0.95rem]"
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              ) : null}

              {actionResults.length ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Suggested commands" className="text-[0.78rem] uppercase tracking-[0.14em] text-zinc-500">
                    {actionResults.map((item) => {
                      const Icon = portalIconMap[item.iconKey];

                      return (
                        <CommandItem
                          key={item.id}
                          value={item.value}
                          onSelect={() => {
                            setOpen(false);
                            const href = item.href;
                            if (href) {
                              startTransition(() => {
                                router.push(href);
                              });
                            }
                          }}
                        >
                          <Icon className="size-4" />
                          <HighlightedText
                            text={getSearchDisplayText(item)}
                            query={query}
                            className="min-w-0 flex-1 truncate text-[0.95rem]"
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              ) : null}

              {askAiResult ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Ask AI" className="text-[0.78rem] uppercase tracking-[0.14em] text-zinc-500">
                    <CommandItem
                      key={askAiResult.id}
                      value={askAiResult.value}
                      onSelect={() => {
                        setOpen(false);
                        void askAiResult.action?.();
                      }}
                    >
                      <SearchIcon className="size-4" />
                      <HighlightedText
                        text={getSearchDisplayText(askAiResult)}
                        query={query}
                        className="min-w-0 flex-1 truncate text-[0.95rem]"
                      />
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </>
          ) : (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}
        </CommandList>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">↑</kbd>
            <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">↵</kbd>
            <span>to select</span>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
