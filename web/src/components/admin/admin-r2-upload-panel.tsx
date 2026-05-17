"use client";

import { useEffect, useState } from "react";
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
  ExternalLinkIcon,
  FolderSearch2Icon,
  ImageIcon,
  LoaderCircleIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { getClientApiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type UploadResult = {
  key: string;
  url: string;
  folder: string;
  fileName: string;
  mimeType: string;
  size: number;
};

const FOLDER_OPTIONS = [
  { value: "admin/uploads", label: "admin/uploads" },
  { value: "admin/banners", label: "admin/banners" },
  { value: "admin/avatars", label: "admin/avatars" },
  { value: "vct/formacoes", label: "vct/formacoes" },
  { value: "vct/layout", label: "vct/layout" },
  { value: "public/assets", label: "public/assets" },
];

function formatBytes(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminR2UploadPanel() {
  const [folder, setFolder] = useState(FOLDER_OPTIONS[0]?.value ?? "admin/uploads");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [uploads, setUploads] = useState<UploadResult[]>([]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(image);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [image]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!image) {
      toast.error("Selecione uma imagem.");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("folder", folder);
      formData.set("image", image);

      const response = await fetch(`${getClientApiBaseUrl()}/admin/r2/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true; image: UploadResult }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !data || !("image" in data)) {
        const message =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : "Falha ao enviar a imagem.";
        throw new Error(message);
      }

      setUploads((current) => [data.image, ...current].slice(0, 6));
      setImage(null);
      toast.success("Imagem enviada para o R2.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a imagem.");
    } finally {
      setPending(false);
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado para a area de transferencia.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-primary">
              <UploadIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Upload para o R2</CardTitle>
              <CardDescription>
                Escolha uma pasta e envie uma imagem. O sistema retorna a chave e a URL publica.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Pasta
                </span>
                <div className="relative">
                  <FolderSearch2Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {FOLDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  O prefixo é gravado no nome do arquivo dentro do bucket.
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Imagem
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG e WEBP. Limite de 5 MB.
                </p>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Preview</p>
                    <p className="text-xs text-muted-foreground">
                      {image ? image.name : "Nenhuma imagem selecionada"}
                    </p>
                  </div>
                  <ImageIcon className="size-5 text-muted-foreground" />
                </div>

                <div className="mt-4 flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview da imagem selecionada"
                      className="max-h-[420px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                      <ImageIcon className="size-10" />
                      <span className="text-sm">Selecione um arquivo para visualizar antes do envio.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Resumo</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Pasta ativa: <span className="font-medium text-foreground">{folder}</span></p>
                    <p>Arquivo: <span className="font-medium text-foreground">{image?.name ?? "--"}</span></p>
                    <p>Tamanho: <span className="font-medium text-foreground">{image ? formatBytes(image.size) : "--"}</span></p>
                  </div>
                </div>

                <Button type="submit" disabled={pending || !image}>
                  {pending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                  Enviar imagem
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Envios recentes</CardTitle>
          <CardDescription>
            As ultimas imagens enviadas nessa sessao.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 text-center text-muted-foreground">
              <ImageIcon className="size-9" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Nenhum envio ainda</p>
                <p className="text-xs">
                  Assim que voce enviar uma imagem, a URL publica aparece aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.key}
                  className={cn(
                    "space-y-3 rounded-2xl border border-border bg-background p-3",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                      <img
                        src={upload.url}
                        alt={upload.fileName}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{upload.fileName}</p>
                      <p className="truncate text-xs text-muted-foreground">{upload.folder}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(upload.size)} · {upload.mimeType}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyValue(upload.url)}
                    >
                      <CopyIcon />
                      Copiar URL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(upload.url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLinkIcon />
                      Abrir
                    </Button>
                  </div>

                  <div className="space-y-1 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-xs">
                    <p className="truncate">
                      <span className="font-medium text-foreground">Key:</span> {upload.key}
                    </p>
                    <p className="truncate">
                      <span className="font-medium text-foreground">URL:</span> {upload.url}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
