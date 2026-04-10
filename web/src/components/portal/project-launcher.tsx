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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="flex flex-col gap-6">
      <Alert className="border-primary/30 bg-primary/10">
        <SparklesIcon className="text-primary" />
        <AlertTitle>Home universal com integracao progressiva</AlertTitle>
        <AlertDescription>
          O launcher centraliza acesso, guarda favoritos e ja tenta ticket SSO
          para os projetos com ticket compartilhado.
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Projetos conectados</CardTitle>
                <CardDescription>
                  Pesquise por nome, tag ou tipo de operacao.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setCommandOpen(true)}>
                <CommandIcon />
                Busca rapida
                <span className="ml-2 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Ctrl K
                </span>
              </Button>
            </div>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar portal, admin, zap, aluno..."
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => setSearch(value));
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs
              value={filterMode}
              onValueChange={(value) => setFilterMode(value as FilterMode)}
            >
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="favorites">Favoritos</TabsTrigger>
                <TabsTrigger value="recent">Recentes</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => {
                const ProjectIcon =
                  iconMap[project.icon as keyof typeof iconMap] ?? SparklesIcon;
                const isFavorite = favorites.includes(project.id);

                return (
                  <Card
                    key={project.id}
                    className="flex h-full flex-col border-border/60 bg-card/85"
                  >
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                            <ProjectIcon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-base leading-tight">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="truncate text-xs">
                              {project.category}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => toggleFavorite(project.id)}
                          aria-label="Favoritar projeto"
                        >
                          <HeartIcon
                            className={cn(
                              isFavorite && "fill-current text-primary",
                            )}
                          />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge>{project.status}</Badge>
                        <Badge variant="secondary">{project.audience}</Badge>
                        {project.ssoMode !== "none" ? (
                          <Badge variant="outline">SSO piloto</Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                        <span className="truncate text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {project.url.replace(/^https?:\/\//, "")}
                        </span>
                        <Button
                          size="sm"
                          className="shrink-0"
                          onClick={() => launchProject(project)}
                        >
                          Abrir
                          <ExternalLinkIcon data-icon="inline-end" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                  <SearchIcon className="size-5 text-muted-foreground" />
                  <p className="font-medium">Nenhum projeto encontrado.</p>
                  <p className="text-sm text-muted-foreground">
                    Ajuste os filtros ou tente outro termo de busca.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Favoritos</CardTitle>
              <CardDescription>
                Seus atalhos rapidos ficam salvos neste navegador.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Marque seus sistemas principais para fixar aqui.
                </p>
              ) : (
                projects
                  .filter((project) => favorites.includes(project.id))
                  .map((project) => (
                    <Button
                      key={project.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => launchProject(project)}
                    >
                      <StarIcon className="text-primary" />
                      {project.name}
                    </Button>
                  ))
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Recentes</CardTitle>
              <CardDescription>
                Ultimos acessos para reduzir cliques no dia a dia.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {orderedRecent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Seus ultimos acessos aparecerao aqui.
                </p>
              ) : (
                orderedRecent.map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    className="justify-between"
                    onClick={() => launchProject(project)}
                  >
                    <span>{project.name}</span>
                    <Badge variant="outline">{project.status}</Badge>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Status da base</CardTitle>
              <CardDescription>
                {projects.filter((project) => project.featured).length} projetos
                destacados no portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Com SSO</span>
                <strong className="text-foreground">
                  {projects.filter((project) => project.ssoMode !== "none").length}
                </strong>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Favoritos salvos</span>
                <strong className="text-foreground">{favorites.length}</strong>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Recentes ativos</span>
                <strong className="text-foreground">{orderedRecent.length}</strong>
              </div>
            </CardContent>
          </Card>
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
