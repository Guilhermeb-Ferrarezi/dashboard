"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { VctFormacaoSummary } from "@/types/portal";
import { CalendarIcon, ImageIcon, MailIcon, PhoneIcon, UsersIcon } from "lucide-react";
import {
  VctFormacaoEditorDialog,
  type FormacaoEditorMode,
} from "@/components/admin/vct-formacao-editor-dialog";

interface VctFormacoesPanelProps {
  initialFormacoes: VctFormacaoSummary[];
  modalidade?: "valorant" | "counter-strike" | "lol";
}

export const VCT_FORMACOES_DIALOG_CLASSNAME =
  "!h-[min(90vh,900px)] !w-[min(96vw,1400px)] !max-w-none sm:!max-w-none overflow-hidden p-0";
export const VCT_FORMACOES_DIALOG_LAYOUT_CLASSNAME =
  "grid min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 md:grid-cols-[320px_minmax(0,1fr)]";
export const VCT_FORMACOES_DIALOG_SIDEBAR_CLASSNAME = "space-y-4 overflow-y-auto pr-1";
export const VCT_FORMACOES_DIALOG_CONTENT_CLASSNAME = "min-h-0 space-y-4 overflow-y-auto pr-1";

export function formatDate(value?: string) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getMemberName(member: VctFormacaoSummary["membros"][number]) {
  return member.nome?.trim() || member.nick?.trim() || "Sem nome";
}

export function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatMemberLabel(member: VctFormacaoSummary["membros"][number]) {
  return member.papel === "capitao" ? "Capitão" : `Jogador ${member.ordem}`;
}

export function getTeamMembers(formacao: VctFormacaoSummary) {
  return [...(formacao.membros ?? [])].sort((a, b) => a.ordem - b.ordem);
}

export function VctFormacoesPanel({ initialFormacoes, modalidade = "valorant" }: VctFormacoesPanelProps) {
  const [formacoes, setFormacoes] = useState(initialFormacoes);
  const [selectedFormacao, setSelectedFormacao] = useState<VctFormacaoSummary | null>(null);
  const [editorMode, setEditorMode] = useState<FormacaoEditorMode | null>(null);
  const [editorFormacao, setEditorFormacao] = useState<VctFormacaoSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VctFormacaoSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    setFormacoes(initialFormacoes);
  }, [initialFormacoes]);

  function openCreateFormacao() {
    setEditorFormacao(null);
    setEditorMode("create");
  }

  function openEditFormacao(formacao: VctFormacaoSummary) {
    setEditorFormacao(formacao);
    setEditorMode("edit");
  }

  function closeEditor() {
    setEditorMode(null);
    setEditorFormacao(null);
  }

  function handleFormacaoSaved(nextFormacao: VctFormacaoSummary) {
    setFormacoes((current) => {
      const next = current.some((item) => item._id === nextFormacao._id)
        ? current.map((item) => (item._id === nextFormacao._id ? nextFormacao : item))
        : [nextFormacao, ...current];
      return next;
    });
    setSelectedFormacao(nextFormacao);
  }

  async function handleDeleteFormacao() {
    if (!deleteTarget) return;

    setDeletePending(true);
    try {
      await clientApi<{ removida: string }>(`/vct/formacoes/${deleteTarget._id}?modalidade=${encodeURIComponent(deleteTarget.modalidade ?? "valorant")}`, {
        method: "DELETE",
      });
      setFormacoes((current) => current.filter((item) => item._id !== deleteTarget._id));
      if (selectedFormacao?._id === deleteTarget._id) {
        setSelectedFormacao(null);
      }
      setDeleteTarget(null);
      toast.success("Formação removida.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover a formação.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  if (formacoes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Nenhuma formação recebida</CardTitle>
            <CardDescription>
              Quando a nova rota enviar um time completo, ele aparece aqui com os jogadores e a logo.
            </CardDescription>
          </div>
          <Button onClick={openCreateFormacao}>
            <PlusIcon />
            Criar formação
          </Button>
        </CardHeader>
        <VctFormacaoEditorDialog
          open={editorMode !== null}
          mode={editorMode ?? "create"}
          modalidade={modalidade}
          formacao={editorFormacao}
          onClose={closeEditor}
          onSaved={handleFormacaoSaved}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Formações</h2>
          <p className="text-xs text-muted-foreground">
            {formacoes.length} formações cadastradas
          </p>
        </div>
        <Button onClick={openCreateFormacao}>
          <PlusIcon />
          Criar formação
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {formacoes.map((formacao) => {
          const membros = getTeamMembers(formacao);
          const capitao = membros.find((m) => m.papel === "capitao");

          return (
            <Card
              key={formacao._id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir detalhes da formação ${formacao.nome}`}
              className="overflow-hidden border-border/70 bg-card/90 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={() => setSelectedFormacao(formacao)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedFormacao(formacao);
                }
              }}
            >
              <CardHeader className="gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
                    {formacao.logoUrl ? (
                      <img
                        src={formacao.logoUrl}
                        alt={`Logo de ${formacao.nome}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="truncate text-lg">{formacao.nome}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{formacao.tag}</Badge>
                      {capitao ? <Badge variant="outline">Capitão: {getMemberName(capitao)}</Badge> : null}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="size-3.5" />
                    {membros.length} membros
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="size-3.5" />
                    {formatDate(formacao.createdAt)}
                  </span>
                  <span className="ml-auto text-[11px] uppercase tracking-[0.22em] text-primary">
                    Clique para ver detalhes
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0" onClick={(event) => event.stopPropagation()}>
                <details className="group rounded-xl border border-border bg-background/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="font-medium">Ver membros</span>
                    <span className="text-xs text-muted-foreground">Abrir / fechar</span>
                  </summary>
                  <div className="space-y-2 border-t border-border px-3 py-3">
                    {membros.map((membro) => (
                      <div
                        key={String(membro._id)}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-xl border px-3 py-2",
                          membro.papel === "capitao"
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card/60",
                        )}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                              {membro.papel === "capitao" ? "Capitão" : `Jogador ${membro.ordem}`}
                            </span>
                            <span className="font-medium">{getMemberName(membro)}</span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {membro.nick} · {membro.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {membro.eloAtual}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(selectedFormacao)}
        onOpenChange={(open) => {
          if (!open) setSelectedFormacao(null);
        }}
      >
        <DialogContent className={VCT_FORMACOES_DIALOG_CLASSNAME}>
          {selectedFormacao ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <DialogHeader className="border-b border-border px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-2xl">{selectedFormacao.nome}</DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{selectedFormacao.tag}</Badge>
                      <Badge variant="outline">{selectedFormacao.membroCount} membros</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(selectedFormacao.createdAt)}</span>
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditFormacao(selectedFormacao)}>
                      <PencilIcon />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(selectedFormacao)}
                    >
                      <Trash2Icon />
                      Excluir
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className={VCT_FORMACOES_DIALOG_LAYOUT_CLASSNAME}>
                <div className={VCT_FORMACOES_DIALOG_SIDEBAR_CLASSNAME}>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted/40">
                    {selectedFormacao.logoUrl ? (
                      <img
                        src={selectedFormacao.logoUrl}
                        alt={`Logo de ${selectedFormacao.nome}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-10 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tag</p>
                      <p className="font-medium">#{selectedFormacao.tag}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Membros</p>
                      <p className="font-medium">{selectedFormacao.membroCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Criado em</p>
                      <p className="font-medium">{formatDate(selectedFormacao.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className={VCT_FORMACOES_DIALOG_CONTENT_CLASSNAME}>
                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Membros da formação</p>
                        <p className="text-xs text-muted-foreground">Contato, nick e elo de cada pessoa.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {getTeamMembers(selectedFormacao).map((membro) => (
                        <div
                          key={String(membro._id)}
                          className={cn(
                            "rounded-2xl border px-4 py-4",
                            membro.papel === "capitao"
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-card/70",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="uppercase tracking-[0.22em]">
                                  {formatMemberLabel(membro)}
                                </Badge>
                                <span className="text-base font-medium">{getMemberName(membro)}</span>
                              </div>
                              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                <span className="inline-flex items-center gap-2">
                                  <MailIcon className="size-4 shrink-0" />
                                  <span className="break-all">{membro.email}</span>
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <PhoneIcon className="size-4 shrink-0" />
                                  <span>{formatWhatsApp(membro.whatsapp)}</span>
                                </span>
                                <span className="break-words">Instagram: {membro.instagram}</span>
                                <span className="break-words">Nick: {membro.nick}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="secondary">{membro.eloAtual}</Badge>
                              <Badge variant="outline">{membro.peakRanking}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <VctFormacaoEditorDialog
        open={editorMode !== null}
        mode={editorMode ?? "create"}
        modalidade={modalidade}
        formacao={editorFormacao}
        onClose={closeEditor}
        onSaved={handleFormacaoSaved}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
      >
        {deleteTarget ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir formação</DialogTitle>
              <DialogDescription>
                Esta ação remove a formação, os membros associados e a logo do R2.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="font-medium">{deleteTarget.nome}</div>
              <div className="text-xs text-muted-foreground">#{deleteTarget.tag}</div>
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={deletePending} onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" disabled={deletePending} onClick={handleDeleteFormacao}>
                {deletePending ? <LoaderCircleIcon className="animate-spin" /> : <Trash2Icon />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
