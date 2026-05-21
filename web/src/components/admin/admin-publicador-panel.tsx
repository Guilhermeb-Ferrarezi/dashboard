"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CopyIcon,
  BookOpenTextIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "@/components/ui/icons";
import { getClientApiBaseUrl } from "@/lib/api";

export type PublishedSiteSummary = {
  route: string;
  title: string;
  archiveFileName: string;
  archiveSizeBytes: number;
  fileCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

type PublicadorPanelProps = {
  initialSites: PublishedSiteSummary[];
};

function formatBytes(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim() ?? "";
}

function buildRoutePath(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function AdminPublicadorPanel({ initialSites }: PublicadorPanelProps) {
  const [route, setRoute] = useState("");
  const [archive, setArchive] = useState<File | null>(null);
  const [archivePreview, setArchivePreview] = useState<string>("");
  const [archiveTitle, setArchiveTitle] = useState<string>("");
  const [archiveInfo, setArchiveInfo] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sites, setSites] = useState(initialSites);
  const archiveInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSites(initialSites);
  }, [initialSites]);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      if (!archive) {
        setArchivePreview("");
        setArchiveTitle("");
        setArchiveInfo("");
        return;
      }

      try {
        const { default: JSZip } = await import("jszip");
        const zip = await JSZip.loadAsync(archive);
        const indexEntry = zip.file(/(^|\/)index\.html$/i)?.find(
          (entry) => entry.name.split("/").filter(Boolean).length === 1,
        );

        if (!indexEntry) {
          throw new Error("O ZIP precisa ter um index.html na raiz.");
        }

        const html = await indexEntry.async("string");
        if (!active) return;

        setArchivePreview(html.trim().slice(0, 2200));
        setArchiveTitle(extractHtmlTitle(html));
        setArchiveInfo(`${zip.filter((relativePath, entry) => !entry.dir).length} arquivos`);
      } catch (error) {
        if (!active) return;
        setArchivePreview("");
        setArchiveTitle("");
        setArchiveInfo("");
        toast.error(error instanceof Error ? error.message : "Falha ao ler o ZIP.");
      }
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [archive]);

  const routePath = useMemo(() => buildRoutePath(route), [route]);

  async function refreshSites() {
    const response = await fetch(`${getClientApiBaseUrl()}/admin/publicador/sites`, {
      credentials: "include",
    });

    const data = (await response.json().catch(() => null)) as
      | { sites: PublishedSiteSummary[] }
      | { ok: false; message?: string }
      | null;

    if (!response.ok || !data || !("sites" in data)) {
      throw new Error("Falha ao atualizar a lista.");
    }

    setSites(data.sites);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!archive) {
      toast.error("Selecione um ZIP.");
      return;
    }

    if (!routePath) {
      toast.error("Informe uma rota.");
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();
      formData.set("route", routePath);
      formData.set("archive", archive);

      const response = await fetch(`${getClientApiBaseUrl()}/admin/publicador/sites`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true; site: PublishedSiteSummary }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !data || !("site" in data)) {
        const message =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : "Falha ao publicar o site.";
        throw new Error(message);
      }

      await refreshSites();
      setArchive(null);
      if (archiveInputRef.current) {
        archiveInputRef.current.value = "";
      }
      toast.success("Site publicado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao publicar o site.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(siteRoute: string) {
    if (!window.confirm(`Remover a rota ${siteRoute}?`)) {
      return;
    }

    setDeletingRoute(siteRoute);

    try {
      const response = await fetch(`${getClientApiBaseUrl()}/admin/publicador/sites`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ route: siteRoute }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !data || !("ok" in data) || !data.ok) {
        const message =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : "Falha ao remover o site.";
        throw new Error(message);
      }

      await refreshSites();
      toast.success("Rota removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover o site.");
    } finally {
      setDeletingRoute(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshSites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar a lista.");
    } finally {
      setRefreshing(false);
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado para a área de transferência.");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent pb-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-primary/10 text-primary shadow-sm">
                <UploadIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>Novo envio</CardTitle>
                <CardDescription>
                  Suba um ZIP estático, escolha a rota e publique no volume compartilhado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Rota pública
                  </span>
                  <Input
                    value={route}
                    onChange={(event) => setRoute(event.target.value)}
                    placeholder="/cursos/abc"
                    className="h-11 rounded-2xl bg-background/80"
                  />
                  <p className="text-xs text-muted-foreground">
                    O arquivo vai ser servido em{" "}
                    <span className="font-medium text-foreground">{routePath || "/"}</span>.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    ZIP
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-2 pl-3">
                    <input
                      ref={archiveInputRef}
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={(event) => setArchive(event.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-border/70 bg-card/80 px-4 text-sm font-medium"
                      onClick={() => archiveInputRef.current?.click()}
                    >
                      Escolher ZIP
                    </Button>
                    <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                      <span className="block truncate font-medium text-foreground">
                        {archive?.name ?? "Nenhum arquivo selecionado"}
                      </span>
                    </div>
                    {archive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setArchive(null);
                          if (archiveInputRef.current) {
                            archiveInputRef.current.value = "";
                          }
                        }}
                        aria-label="Remover arquivo selecionado"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precisa conter <span className="font-medium text-foreground">index.html</span> na raiz.
                  </p>
                </label>
              </div>

              <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-muted/25 to-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {archiveTitle || "Preview do index.html"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {archive ? archive.name : "Nenhum ZIP selecionado"}
                    </p>
                  </div>
                  <BookOpenTextIcon className="size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="mt-4 min-h-[320px] overflow-hidden rounded-2xl border border-border/70 bg-background/90">
                  {archivePreview ? (
                    <iframe
                      title="Preview do index.html"
                      sandbox=""
                      srcDoc={archivePreview}
                      className="h-[560px] w-full border-0 bg-background"
                    />
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
                        <BookOpenTextIcon className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Preview aguardando arquivo</p>
                        <p className="max-w-sm text-xs">
                          O conteúdo da raiz do ZIP aparece aqui antes do envio.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {archiveInfo ? (
                  <p className="mt-3 text-xs text-muted-foreground">{archiveInfo}</p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={pending || !archive}
                  className="h-11 w-full rounded-2xl sm:w-auto sm:min-w-[200px]"
                >
                  {pending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                  Publicar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Rotas publicadas</CardTitle>
                <CardDescription>
                  Conteúdo servido pelo container de sites que monta o volume compartilhado.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {formatInteger(sites.length)} ativas
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Atualizar lista"
                >
                  {refreshing ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {sites.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/20 text-center text-muted-foreground">
                <BookOpenTextIcon className="size-9" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Nenhuma rota publicada</p>
                  <p className="text-xs">Quando você enviar um ZIP, ele aparece aqui.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sites.map((site) => (
                  <div
                    key={site.route}
                    className="group relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-muted/25 via-background to-background p-4 transition-colors hover:border-border"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary/60" />
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="min-w-0 space-y-2">
                        <div className="space-y-1">
                          <p className="truncate text-sm font-semibold text-foreground">{site.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{site.route}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1">
                            {site.fileCount} arquivos
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1">
                            {formatBytes(site.archiveSizeBytes)}
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1">
                            Atualizado em {formatDate(site.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => copyValue(site.route)}
                          aria-label={`Copiar rota ${site.route}`}
                        >
                          <CopyIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          render={
                            <Link
                              href={site.route}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir ${site.route}`}
                            />
                          }
                        >
                          <ExternalLinkIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-xl text-destructive hover:text-destructive"
                          onClick={() => handleDelete(site.route)}
                          disabled={deletingRoute === site.route}
                          aria-label={`Remover rota ${site.route}`}
                        >
                          {deletingRoute === site.route ? (
                            <LoaderCircleIcon className="size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/70 bg-background/90 p-3 pl-5">
                      <pre className="max-h-40 overflow-auto text-[11px] leading-5 text-muted-foreground">
                        <code>{site.preview}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
