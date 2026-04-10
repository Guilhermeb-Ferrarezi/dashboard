"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import {
  BellRingIcon,
  BookOpenTextIcon,
  CommandIcon,
  ExternalLinkIcon,
  HeartIcon,
  LayoutGridIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";
import type { PortalProject } from "@/types/portal";

const iconMap = {
  bolt: ZapIcon,
  shield: ShieldCheckIcon,
  academy: BookOpenTextIcon,
  bell: BellRingIcon,
  grid: LayoutGridIcon,
  sparkles: SparklesIcon,
} as const;

type FilterMode = "all" | "favorites" | "recent";

interface ProjectLauncherProps {
  user: SessionUser;
  projects: PortalProject[];
}

function favoriteKey(userId: string) {
  return `st:favorites:${userId}`;
}

function recentKey(userId: string) {
  return `st:recent:${userId}`;
}

export function ProjectLauncher({ user, projects }: ProjectLauncherProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const storedFavorites = window.localStorage.getItem(favoriteKey(user.id));

    return storedFavorites ? JSON.parse(storedFavorites) : [];
  });
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const storedRecent = window.localStorage.getItem(recentKey(user.id));

    return storedRecent ? JSON.parse(storedRecent) : [];
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    window.localStorage.setItem(favoriteKey(user.id), JSON.stringify(favorites));
  }, [favorites, user.id]);

  useEffect(() => {
    window.localStorage.setItem(recentKey(user.id), JSON.stringify(recent));
  }, [recent, user.id]);

  const onCommandKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setCommandOpen((current) => !current);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onCommandKeyDown);

    return () => {
      window.removeEventListener("keydown", onCommandKeyDown);
    };
  }, []);

  const orderedRecent = useMemo(() => {
    return recent
      .map((id) => projects.find((project) => project.id === id))
      .filter((project): project is PortalProject => Boolean(project));
  }, [projects, recent]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let result = projects.filter((project) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        project.name,
        project.description,
        project.category,
        project.audience,
        ...project.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

    if (filterMode === "favorites") {
      result = result.filter((project) => favorites.includes(project.id));
    }

    if (filterMode === "recent") {
      result = orderedRecent.filter((project) =>
        result.some((candidate) => candidate.id === project.id),
      );
    }

    return result;
  }, [deferredSearch, favorites, filterMode, orderedRecent, projects]);

  async function launchProject(project: PortalProject) {
    setRecent((current) => [
      project.id,
      ...current.filter((item) => item !== project.id),
    ].slice(0, 6));

    try {
      if (project.ssoMode === "shared-ticket") {
        const response = await clientApi<{ redirectUrl: string }>(
          `/sso/${project.id}/start`,
          { method: "POST" },
        );
        window.location.assign(response.redirectUrl);
        return;
      }

      window.location.assign(project.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel abrir o projeto.",
      );
    }
  }

  function toggleFavorite(projectId: string) {
    setFavorites((current) =>
      current.includes(projectId)
        ? current.filter((item) => item !== projectId)
        : [projectId, ...current].slice(0, 12),
    );
  }

  const statusStyle: Record<string, string> = {
    live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    pilot: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    beta: "border-sky-500/25 bg-sky-500/10 text-sky-400",
  };

  const statusDot: Record<string, string> = {
    live: "bg-emerald-400",
    pilot: "bg-amber-400",
    beta: "bg-sky-400",
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Search & filter bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            className="h-11 rounded-xl border-border/50 bg-card/60 pl-10 text-sm backdrop-blur-sm placeholder:text-muted-foreground/50"
            placeholder="Buscar portal, admin, zap, aluno..."
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearch(value));
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={filterMode}
            onValueChange={(value) => setFilterMode(value as FilterMode)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs">Favoritos</TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">Recentes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer gap-2 rounded-xl border-border/50 bg-card/40 backdrop-blur-sm"
            onClick={() => setCommandOpen(true)}
          >
            <CommandIcon className="size-3.5" />
            <span className="hidden sm:inline">Busca rapida</span>
            <kbd className="pointer-events-none ml-1 hidden rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Ctrl K
            </kbd>
          </Button>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Project grid */}
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const ProjectIcon =
                iconMap[project.icon as keyof typeof iconMap] ?? SparklesIcon;
              const isFavorite = favorites.includes(project.id);

              return (
                <div
                  key={project.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm transition-all duration-300 hover:border-border/70 hover:bg-card/90 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  {/* Top accent line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/8 text-primary transition-colors duration-300 group-hover:border-primary/20 group-hover:bg-primary/12">
                          <ProjectIcon className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-sm font-semibold leading-tight tracking-[-0.01em]">
                            {project.name}
                          </h3>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                            {project.category}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted/50 hover:text-primary"
                        onClick={() => toggleFavorite(project.id)}
                        aria-label="Favoritar projeto"
                      >
                        <HeartIcon
                          className={cn(
                            "size-4",
                            isFavorite && "fill-current text-primary",
                          )}
                        />
                      </button>
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          statusStyle[project.status],
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", statusDot[project.status])} />
                        {project.status}
                      </span>
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {project.audience}
                      </span>
                      {project.ssoMode !== "none" ? (
                        <span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/80">
                          SSO
                        </span>
                      ) : null}
                    </div>

                    {/* Description */}
                    <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground/80">
                      {project.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-end border-t border-border/30 pt-4">
                      <Button
                        size="sm"
                        className="h-8 shrink-0 gap-1.5 rounded-lg bg-primary/90 px-3.5 text-xs font-medium text-primary-foreground shadow-none transition-all hover:bg-primary"
                        title={project.url.replace(/^https?:\/\//, "")}
                        onClick={() => launchProject(project)}
                      >
                        Abrir
                        <ExternalLinkIcon className="size-3" data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/30">
                <SearchIcon className="size-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium">Nenhum projeto encontrado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste os filtros ou tente outro termo de busca.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Favorites */}
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <StarIcon className="size-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Favoritos</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              {favorites.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground/60">
                  Clique no coracao para fixar projetos aqui.
                </p>
              ) : (
                projects
                  .filter((project) => favorites.includes(project.id))
                  .map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                      onClick={() => launchProject(project)}
                    >
                      <StarIcon className="size-3.5 shrink-0 text-primary/70" />
                      <span className="truncate text-foreground/90">{project.name}</span>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Recent */}
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10">
                <ZapIcon className="size-3.5 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold">Recentes</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              {orderedRecent.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground/60">
                  Seus ultimos acessos aparecerao aqui.
                </p>
              ) : (
                orderedRecent.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    onClick={() => launchProject(project)}
                  >
                    <span className="truncate text-sm text-foreground/90">{project.name}</span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        statusStyle[project.status],
                      )}
                    >
                      <span className={cn("size-1 rounded-full", statusDot[project.status])} />
                      {project.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheckIcon className="size-3.5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold">Status da base</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Projetos", value: projects.length },
                { label: "Com SSO", value: projects.filter((p) => p.ssoMode !== "none").length },
                { label: "Favoritos", value: favorites.length },
                { label: "Recentes", value: orderedRecent.length },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground/70">{stat.label}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground/90">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command>
          <CommandInput placeholder="Digite o nome de um projeto..." />
          <CommandList>
            <CommandEmpty>Nenhum projeto corresponde a busca.</CommandEmpty>
            <CommandGroup heading="Projetos">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.category} ${project.tags.join(" ")}`}
                  onSelect={() => {
                    setCommandOpen(false);
                    void launchProject(project);
                  }}
                >
                  <span>{project.name}</span>
                  <CommandShortcut>{project.category}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
