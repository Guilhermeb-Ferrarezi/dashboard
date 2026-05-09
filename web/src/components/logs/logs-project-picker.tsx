"use client";

import Link from "next/link";
import { ActivityIcon, FolderSearch2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LogsProject } from "@/types/logs";

function normalizeProject(project: Record<string, unknown>): LogsProject {
  return {
    id: String(project.id ?? ""),
    name: String(project.name ?? "Projeto sem nome"),
    slug: String(project.slug ?? ""),
    apiKey: String(project.apiKey ?? ""),
    totalLogs:
      typeof project.totalLogs === "number" ? project.totalLogs : undefined,
    latest:
      project.latest && typeof project.latest === "object"
        ? {
            occurredAt:
              typeof (project.latest as Record<string, unknown>).occurredAt === "string"
                ? String((project.latest as Record<string, unknown>).occurredAt)
                : null,
            method:
              typeof (project.latest as Record<string, unknown>).method === "string"
                ? String((project.latest as Record<string, unknown>).method)
                : null,
            status:
              typeof (project.latest as Record<string, unknown>).status === "number"
                ? Number((project.latest as Record<string, unknown>).status)
                : null,
            endpoint:
              typeof (project.latest as Record<string, unknown>).endpoint === "string"
                ? String((project.latest as Record<string, unknown>).endpoint)
                : null,
          }
        : null,
  };
}

const cardDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function LogsProjectPicker() {
  const [projects, setProjects] = useState<LogsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const response = await clientApi<{ projects: Record<string, unknown>[] }>(
          "/logs/projects",
        );

        if (ignore) {
          return;
        }

        setProjects(response.projects.map(normalizeProject));
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nao foi possivel carregar os projetos.",
        );
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Card className="border-border/60 bg-card/90">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderSearch2Icon />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl">Escolha um projeto</CardTitle>
              <CardDescription>
                Selecione a origem de logs que voce quer inspecionar.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/logs/${project.id}`}
                  className={cn(
                    "group rounded-2xl border border-border/70 bg-background/40 p-5 transition-all hover:border-primary/35 hover:bg-primary/6 hover:shadow-sm",
                  )}
                >
                  <div className="flex h-full flex-col gap-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-medium">
                          {project.name}
                        </h2>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          /{project.slug}
                        </p>
                      </div>
                      <Badge variant="outline">Logs</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abrir visao detalhada com filtros, tabela e paginação.
                    </p>
                    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Total de logs
                        </span>
                        <span className="font-semibold">
                          {project.totalLogs ?? 0}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Ultimo evento
                        </span>
                        <div className="text-right text-sm">
                          {project.latest?.occurredAt ? (
                            <span className="text-muted-foreground">
                              {cardDateFormatter.format(
                                new Date(project.latest.occurredAt),
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem dados</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Ultima requisição
                        </span>
                        <div className="flex items-center gap-2">
                          {project.latest?.method ? (
                            <Badge variant="outline">{project.latest.method}</Badge>
                          ) : null}
                          {typeof project.latest?.status === "number" ? (
                            <Badge variant="outline">{project.latest.status}</Badge>
                          ) : null}
                        </div>
                      </div>
                      {project.latest?.endpoint ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ActivityIcon className="mt-0.5 size-4 shrink-0" />
                          <span className="truncate font-mono">
                            {project.latest.endpoint}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}

              {projects.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-border/80 px-6 py-16 text-center text-sm text-muted-foreground">
                  Nenhum projeto de logs encontrado.
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
