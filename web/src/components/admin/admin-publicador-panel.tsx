"use client";

import JSZip from "jszip";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  Trash2Icon,
  UploadIcon,
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

export function AdminPublicadorPanel({ initialSites }: PublicadorPanelProps) {
  const [route, setRoute] = useState("/mizake/site-novo");
  const [archive, setArchive] = useState<File | null>(null);
  const [archivePreview, setArchivePreview] = useState<string>("");
  const [archiveTitle, setArchiveTitle] = useState<string>("");
  const [archiveInfo, setArchiveInfo] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [sites, setSites] = useState(initialSites);

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

      setSites((current) => [data.site, ...current.filter((site) => site.route !== data.site.route)]);
      setArchive(null);
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

      setSites((current) => current.filter((site) => site.route !== siteRoute));
      toast.success("Rota removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover o site.");
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado para a area de transferencia.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-primary">
              <UploadIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Publicador de sites</CardTitle>
              <CardDescription>
                Suba um ZIP estatico, escolha a rota e publique no volume compartilhado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Rota publica
                </span>
                <Input
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                  placeholder="/mizake/site-novo"
                />
                <p className="text-xs text-muted-foreground">
                  O arquivo vai ser servido em <span className="font-medium text-foreground">{routePath || "/"}</span>.
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  ZIP
                </span>
                <Input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(event) => setArchive(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Precisa conter <span className="font-medium text-foreground">index.html</span> na raiz.
                </p>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Preview do index.html</p>
                    <p className="text-xs text-muted-foreground">
                      {archive ? archive.name : "Nenhum ZIP selecionado"}
                    </p>
                  </div>
                  <BookOpenTextIcon className="size-5 text-muted-foreground" />
                </div>

                <div className="mt-4 min-h-[280px] overflow-hidden rounded-2xl border border-border bg-background">
                  {archivePreview ? (
                    <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-5 text-foreground">
                      <code>{archivePreview}</code>
                    </pre>
                  ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                      <BookOpenTextIcon className="size-10" />
                      <p className="text-sm font-medium text-foreground">Preview aguardando arquivo</p>
                      <p className="max-w-sm text-xs">
                        O conteúdo da raiz do ZIP aparece aqui antes do envio.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Resumo</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Rota:{" "}
                      <span className="font-medium text-foreground">{routePath || "--"}</span>
                    </p>
                    <p>
                      Arquivo:{" "}
                      <span className="font-medium text-foreground">{archive?.name ?? "--"}</span>
                    </p>
                    <p>
                      Tamanho:{" "}
                      <span className="font-medium text-foreground">
                        {archive ? formatBytes(archive.size) : "--"}
                      </span>
                    </p>
                    <p>
                      Titulo:{" "}
                      <span className="font-medium text-foreground">{archiveTitle || "--"}</span>
                    </p>
                    <p>
                      Itens:{" "}
                      <span className="font-medium text-foreground">{archiveInfo || "--"}</span>
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={pending || !archive}>
                  {pending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                  Publicar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Rotas publicadas</CardTitle>
          <CardDescription>
            Conteudo servido pelo container de sites que monta o volume compartilhado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sites.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 text-center text-muted-foreground">
              <BookOpenTextIcon className="size-9" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Nenhuma rota publicada</p>
                <p className="text-xs">Quando voce enviar um ZIP, ele aparece aqui.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.route}
                  className="rounded-2xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{site.title}</p>
                        <p className="text-xs text-muted-foreground">{site.route}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{site.fileCount} arquivos</span>
                        <span>{formatBytes(site.archiveSizeBytes)}</span>
                        <span>Atualizado em {formatDate(site.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyValue(site.route)}
                        aria-label={`Copiar rota ${site.route}`}
                      >
                        <CopyIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <Link href={site.route} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(site.route)}
                        aria-label={`Remover rota ${site.route}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-background p-3">
                    <pre className="max-h-40 overflow-auto text-[11px] leading-5 text-muted-foreground">
                      <code>{site.preview}</code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              refreshSites().catch((error) => {
                toast.error(error instanceof Error ? error.message : "Falha ao atualizar a lista.");
              })
            }
          >
            Atualizar lista
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
