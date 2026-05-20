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

function formatInteger(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function AdminPublicadorPanel({ initialSites }: PublicadorPanelProps) {
  const [route, setRoute] = useState("/cursos/abc");
  const [archive, setArchive] = useState<File | null>(null);
  const [archivePreview, setArchivePreview] = useState<string>("");
  const [archiveTitle, setArchiveTitle] = useState<string>("");
  const [archiveInfo, setArchiveInfo] = useState<string>("");
  const [pending, setPending] = useState(false);
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

  useEffect(() => {
    refreshSites().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar a lista.");
    });
  }, []);

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
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado para a area de transferencia.");
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -right-16 top-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              Publicador de sites
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Publique ZIPs estaticos com mais clareza visual e menos friccao
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Escolha a rota, envie o ZIP e confira o preview antes de publicar. O volume
                compartilhado recebe o arquivo final e o container de sites entrega a rota publica.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Rotas ativas</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{formatInteger(sites.length)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Publicador</p>
                <p className="mt-1 text-sm font-medium text-foreground">Pronto para enviar</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Fluxo</p>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    1
                  </span>
                  <p>Defina a rota publica que vai receber o index.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    2
                  </span>
                  <p>Escolha o ZIP e confira o preview do index.html.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    3
                  </span>
                  <p>Publique e veja a rota entrar na lista de sites.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/70 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guia rapido</p>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>1. Defina a rota publica.</p>
                <p>2. Escolha o ZIP com index.html na raiz.</p>
                <p>3. Publique e confirme a rota na lista ao lado.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent pb-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-primary/10 text-primary shadow-sm">
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
          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Rota publica
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
                        {archive?.name ?? "No file selected"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precisa conter <span className="font-medium text-foreground">index.html</span> na raiz.
                  </p>
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
                <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-muted/25 to-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Preview do index.html</p>
                      <p className="text-xs text-muted-foreground">
                        {archive ? archive.name : "Nenhum ZIP selecionado"}
                      </p>
                    </div>
                    <BookOpenTextIcon className="size-5 text-muted-foreground" />
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
                            O conteudo da raiz do ZIP aparece aqui antes do envio.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-end rounded-3xl border border-border/70 bg-background/80 p-4">
                  <Button type="submit" disabled={pending || !archive} className="h-11 rounded-2xl">
                    {pending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                    Publicar
                  </Button>
                </div>
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
                  Conteudo servido pelo container de sites que monta o volume compartilhado.
                </CardDescription>
              </div>
              <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatInteger(sites.length)} ativas
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {sites.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/20 text-center text-muted-foreground">
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
                          className="rounded-xl text-destructive hover:text-destructive"
                          onClick={() => handleDelete(site.route)}
                          aria-label={`Remover rota ${site.route}`}
                        >
                          <Trash2Icon className="size-4" />
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

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-2xl"
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
    </div>
  );
}
