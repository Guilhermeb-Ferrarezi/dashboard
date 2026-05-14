"use client";

import Link from "next/link";
import { ArrowLeftIcon, ClipboardIcon, RefreshCwIcon } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { HttpMethod, LogsPagePayload, LogsProject, ProjectLogEntry } from "@/types/logs";

const PAGE_SIZE = 20;
const METHOD_OPTIONS = ["Todos", "GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const LAST_LOGS_PROJECT_ID_KEY = "logs:last-project-id";

type DraftFilters = {
  search: string;
  method: "" | HttpMethod;
  from: string;
  to: string;
};

const initialFilters: DraftFilters = {
  search: "",
  method: "",
  from: "",
  to: "",
};

const logsDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function normalizeProject(project: Record<string, unknown>): LogsProject {
  return {
    id: String(project.id ?? ""),
    name: String(project.name ?? "Projeto sem nome"),
    slug: String(project.slug ?? ""),
    apiKey: String(project.apiKey ?? ""),
  };
}

function normalizeLog(log: Record<string, unknown>): ProjectLogEntry {
  const user =
    typeof log.user === "object" && log.user !== null
      ? (log.user as Record<string, unknown>)
      : null;

  return {
    id: String(log.id ?? ""),
    status: Number(log.status ?? 0),
    method: String(log.method ?? "SYSTEM").toUpperCase(),
    endpoint: String(log.endpoint ?? "/"),
    url: typeof log.url === "string" ? log.url : undefined,
    ip: String(log.ip ?? "-"),
    durationMs: Number(log.durationMs ?? 0),
    createdAt: String(log.createdAt ?? new Date().toISOString()),
    user: user
      ? {
          id: String(user.id ?? ""),
          name: String(user.name ?? ""),
          email: typeof user.email === "string" ? user.email : null,
          role: typeof user.role === "string" ? user.role : null,
        }
      : null,
    requestPayload: log.requestPayload,
    responsePayload: log.responsePayload,
  };
}

function getUserLabel(user: ProjectLogEntry["user"]) {
  if (!user) {
    return "-";
  }

  return user.name || user.id || "-";
}

function formatPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return "null";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightPayload(payload: unknown) {
  const formatted = formatPayload(payload);
  const escaped = escapeHtml(formatted);

  return escaped.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, quoted, keySuffix, booleanValue) => {
      if (quoted) {
        if (keySuffix) {
          return `<span class="text-violet-400">${quoted}</span><span class="text-muted-foreground">${keySuffix}</span>`;
        }

        return `<span class="text-emerald-400">${quoted}</span>`;
      }

      if (booleanValue) {
        return `<span class="text-amber-400">${match}</span>`;
      }

      if (match === "null") {
        return `<span class="text-cyan-400">${match}</span>`;
      }

      return `<span class="text-sky-400">${match}</span>`;
    },
  );
}

function getStatusBadgeClass(status: number) {
  if (status >= 200 && status < 300) {
    return "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }

  if (status >= 300 && status < 400) {
    return "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300";
  }

  if (status >= 400 && status < 500) {
    return "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300";
  }

  if (status >= 500) {
    return "border-orange-500/20 bg-orange-500/12 text-orange-700 dark:text-orange-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function buildLogsQuery(
  projectId: string,
  page: number,
  filters: DraftFilters,
) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(PAGE_SIZE),
  });

  if (filters.search) {
    query.set("search", filters.search);
  }

  if (filters.method) {
    query.set("method", filters.method);
  }

  if (filters.from) {
    query.set("from", filters.from);
  }

  if (filters.to) {
    query.set("to", filters.to);
  }

  return query.toString();
}

export function ProjectLogsView({ projectId }: { projectId: string }) {
  const [projects, setProjects] = useState<LogsProject[]>([]);
  const [logsState, setLogsState] = useState<LogsPagePayload>({
    logs: [],
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [projectLoading, setProjectLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [logsError, setLogsError] = useState("");
  const [selectedLog, setSelectedLog] = useState<ProjectLogEntry | null>(null);
  const [activePayloadTab, setActivePayloadTab] = useState("request");

  const selectedProject =
    projects.find((project) => project.id === projectId) ?? null;

  useEffect(() => {
    window.localStorage.setItem(LAST_LOGS_PROJECT_ID_KEY, projectId);
    window.dispatchEvent(
      new CustomEvent("logs:last-project-changed", {
        detail: {
          projectId,
          projectName: selectedProject?.name ?? projectId,
        },
      }),
    );
  }, [projectId, selectedProject?.name]);

  useEffect(() => {
    let ignore = false;

    async function loadProjects() {
      setProjectLoading(true);
      setProjectError("");

      try {
        const response = await clientApi<{ projects: Record<string, unknown>[] }>(
          "/logs/projects",
        );

        if (ignore) {
          return;
        }

        const nextProjects = response.projects.map(normalizeProject);
        setProjects(nextProjects);

        if (!nextProjects.some((project) => project.id === projectId)) {
          setProjectError("Projeto de logs nao encontrado.");
        }
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        setProjectError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nao foi possivel carregar o projeto.",
        );
      } finally {
        if (!ignore) {
          setProjectLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    let ignore = false;

    async function loadLogs() {
      if (!projectId) {
        return;
      }

      setLogsLoading(true);
      setLogsError("");

      try {
        const query = buildLogsQuery(projectId, page, appliedFilters);
        const response = await clientApi<Record<string, unknown>>(`/logs?${query}`);
        const rawLogs = Array.isArray(response.logs) ? response.logs : [];
        const totalPages = Number(response.totalPages ?? response.pages ?? 1) || 1;
        const total = Number(response.total ?? response.count ?? rawLogs.length) || 0;

        if (ignore) {
          return;
        }

        setLogsState({
          logs: rawLogs.map((entry) => normalizeLog(entry as Record<string, unknown>)),
          page: Number(response.page ?? page) || page,
          totalPages,
          total,
        });
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        setLogsError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nao foi possivel carregar os logs.",
        );
      } finally {
        if (!ignore) {
          setLogsLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      ignore = true;
    };
  }, [appliedFilters, page, projectId]);

  function handleApplyFilters() {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  async function handleCopyPayload(payload: unknown, label: string) {
    try {
      await navigator.clipboard.writeText(formatPayload(payload));
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Nao foi possivel copiar ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Card className="min-h-0 border-border/60 bg-card/90">
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/logs" />}
                  className="-ml-2 mb-2 w-fit"
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Projetos
                </Button>
                <CardTitle className="text-xl">
                  {selectedProject ? `Logs — ${selectedProject.name}` : "Logs"}
                </CardTitle>
                <CardDescription>
                  {selectedProject
                    ? "Acompanhe eventos, status HTTP e latencia por endpoint."
                    : "Carregando projeto selecionado."}
                </CardDescription>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_180px_180px_240px_180px_auto] xl:items-end">
              <Input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Pesquisar por endpoint"
                disabled={!selectedProject || projectLoading}
              />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Metodo
                </span>
                <select
                  value={draftFilters.method}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      method: event.target.value as DraftFilters["method"],
                    }))
                  }
                  disabled={!selectedProject || projectLoading}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
                >
                  {METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method === "Todos" ? "" : method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  De
                </span>
                <Input
                  type="date"
                  value={draftFilters.from}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  disabled={!selectedProject || projectLoading}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Ate
                </span>
                <Input
                  type="date"
                  value={draftFilters.to}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  disabled={!selectedProject || projectLoading}
                />
              </label>
              <Button
                variant="outline"
                onClick={handleApplyFilters}
                disabled={!selectedProject || logsLoading || projectLoading}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  className={cn(logsLoading && "animate-spin")}
                />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          {projectLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          ) : null}

          {!projectLoading && projectError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
              {projectError}
            </div>
          ) : null}

          {!projectLoading && !projectError ? (
            <>
              {logsError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
                  {logsError}
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70">
                <div className="h-full overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-border/70">
                      <TableRow className="bg-muted/40">
                        <TableHead>Status</TableHead>
                        <TableHead>Metodo</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Autor</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        Array.from({ length: 8 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-10 w-full rounded-lg" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : null}

                      {!logsLoading && logsState.logs.length > 0
                        ? logsState.logs.map((entry) => (
                            <TableRow
                              key={entry.id}
                              className="cursor-pointer transition-colors hover:bg-muted/45"
                              onClick={() => setSelectedLog(entry)}
                            >
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={getStatusBadgeClass(entry.status)}
                                >
                                  {entry.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{entry.method}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[360px] font-mono text-xs sm:max-w-[520px]">
                                <span className="block truncate">{entry.endpoint}</span>
                              </TableCell>
                              <TableCell className="max-w-[220px]">
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-sm font-medium">
                                    {getUserLabel(entry.user)}
                                  </span>
                                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                                    {entry.user?.id || "sem userId"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {entry.ip}
                              </TableCell>
                              <TableCell>{entry.durationMs} ms</TableCell>
                              <TableCell className="text-muted-foreground">
                                {logsDateFormatter.format(new Date(entry.createdAt))}
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </TableBody>
                  </Table>

                  {!logsLoading && logsState.logs.length === 0 ? (
                    <div className="flex min-h-72 items-center justify-center border-t border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
                      Nenhum log encontrado.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {logsState.total} logs encontrados.
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={logsLoading || page <= 1}
                  >
                    Anterior
                  </Button>
                  <span className="min-w-20 text-center text-sm text-muted-foreground">
                    Pagina {logsState.page} de {Math.max(logsState.totalPages, 1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(Math.max(logsState.totalPages, 1), current + 1),
                      )
                    }
                    disabled={logsLoading || page >= Math.max(logsState.totalPages, 1)}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
            setActivePayloadTab("request");
          }
        }}
      >
        <DialogContent className="h-[72vh] w-[calc(100vw-4rem)] max-w-[calc(100vw-4rem)] p-0 sm:w-[900px] sm:max-w-[700px]">
          {selectedLog ? (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle>Detalhes da requisição</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[120px_160px_220px_minmax(0,1fr)]">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Método
                    </p>
                    <p className="mt-2 text-lg font-semibold">{selectedLog.method}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      IP
                    </p>
                    <p className="mt-2 font-mono text-base">{selectedLog.ip}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Autor
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {getUserLabel(selectedLog.user)}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {selectedLog.user?.id || "sem userId"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Endpoint
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <p className="font-mono text-sm whitespace-nowrap">
                        {selectedLog.url || selectedLog.endpoint}
                      </p>
                    </div>
                  </div>
                </div>

                <Tabs
                  value={activePayloadTab}
                  onValueChange={setActivePayloadTab}
                  className="min-h-0 flex-1 gap-0"
                >
                  <div className="flex items-end justify-between gap-3 border-b">
                    <TabsList variant="line" className="rounded-none border-0 px-0">
                      <TabsTrigger value="request">Request</TabsTrigger>
                      <TabsTrigger value="response">Response</TabsTrigger>
                    </TabsList>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-1"
                      onClick={() =>
                        handleCopyPayload(
                          activePayloadTab === "request"
                            ? selectedLog.requestPayload
                            : selectedLog.responsePayload,
                          activePayloadTab === "request" ? "Request" : "Response",
                        )
                      }
                    >
                      <ClipboardIcon data-icon="inline-start" />
                      Copiar payload
                    </Button>
                  </div>

                  <TabsContent value="request" className="min-h-0 flex-1">
                    <div className="pt-4">
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                        <pre
                          className="h-[30rem] w-[40rem] overflow-auto px-5 py-5 font-mono text-sm leading-7 whitespace-pre text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: highlightPayload(selectedLog.requestPayload),
                          }}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="response" className="min-h-0 flex-1 pt-4">
                    <div className="flex flex-wrap items-center gap-4 px-2 pb-3 text-base">
                      <div className="flex flex-wrap items-center gap-4">
                        <p>
                          <span className="font-semibold">Status HTTP:</span>{" "}
                          <span
                            className={cn(
                              selectedLog.status >= 400
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-300",
                            )}
                          >
                            {selectedLog.status}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Tempo:</span>{" "}
                          {selectedLog.durationMs} ms
                        </p>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                      <pre
                        className="h-[27.7rem] w-[40rem] overflow-auto px-5 py-5 font-mono text-sm leading-7 whitespace-pre text-foreground"
                        dangerouslySetInnerHTML={{
                          __html: highlightPayload(selectedLog.responsePayload),
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
