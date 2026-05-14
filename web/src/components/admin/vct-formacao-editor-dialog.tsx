"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircleIcon, SaveIcon, UploadIcon } from "@/components/ui/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getClientApiBaseUrl } from "@/lib/api";
import type { VctFormacaoSummary } from "@/types/portal";

type GameSlug = "valorant" | "counter-strike" | "lol";

type FormacaoMemberForm = {
  nome: string;
  email: string;
  instagram: string;
  whatsapp: string;
  nick: string;
  eloAtual: string;
  peakRanking: string;
};

type FormacaoEditorForm = {
  nome: string;
  tag: string;
  logoFile: File | null;
  logoPreview: string;
  capitao: FormacaoMemberForm;
  jogadores: FormacaoMemberForm[];
};

type ApiFormacaoMember = FormacaoMemberForm;

export type FormacaoEditorMode = "create" | "edit";

interface VctFormacaoEditorDialogProps {
  open: boolean;
  mode: FormacaoEditorMode;
  modalidade: GameSlug;
  formacao?: VctFormacaoSummary | null;
  onClose: () => void;
  onSaved: (formacao: VctFormacaoSummary) => void;
}

function cloneMember(member?: Partial<FormacaoMemberForm> | null): FormacaoMemberForm {
  return {
    nome: member?.nome ?? "",
    email: member?.email ?? "",
    instagram: member?.instagram ?? "",
    whatsapp: member?.whatsapp ?? "",
    nick: member?.nick ?? "",
    eloAtual: member?.eloAtual ?? "",
    peakRanking: member?.peakRanking ?? "",
  };
}

function createBlankFormacaoForm(): FormacaoEditorForm {
  return {
    nome: "",
    tag: "",
    logoFile: null,
    logoPreview: "",
    capitao: cloneMember(),
    jogadores: [cloneMember(), cloneMember(), cloneMember(), cloneMember()],
  };
}

function createFormacaoFormFromFormacao(formacao: VctFormacaoSummary): FormacaoEditorForm {
  const membros = [...(formacao.membros ?? [])].sort((a, b) => a.ordem - b.ordem);
  return {
    nome: formacao.nome ?? "",
    tag: formacao.tag ?? "",
    logoFile: null,
    logoPreview: formacao.logoUrl ?? "",
    capitao: cloneMember(membros[0] ?? null),
    jogadores: [cloneMember(membros[1] ?? null), cloneMember(membros[2] ?? null), cloneMember(membros[3] ?? null), cloneMember(membros[4] ?? null)],
  };
}

function parseMember(member: FormacaoMemberForm): ApiFormacaoMember {
  return {
    nome: member.nome.trim(),
    email: member.email.trim(),
    instagram: member.instagram.trim(),
    whatsapp: member.whatsapp.trim(),
    nick: member.nick.trim(),
    eloAtual: member.eloAtual.trim(),
    peakRanking: member.peakRanking.trim(),
  };
}

function buildPayload(form: FormacaoEditorForm, modalidade: GameSlug) {
  return {
    modalidade,
    time: {
      nome: form.nome.trim(),
      tag: form.tag.trim(),
    },
    capitao: parseMember(form.capitao),
    jogadores: form.jogadores.map(parseMember),
  };
}

function isValidForm(form: FormacaoEditorForm) {
  if (!form.nome.trim() || !form.tag.trim()) return false;
  if (!form.capitao.nome.trim() || !form.capitao.email.trim() || !form.capitao.instagram.trim() || !form.capitao.whatsapp.trim() || !form.capitao.nick.trim() || !form.capitao.eloAtual.trim() || !form.capitao.peakRanking.trim()) {
    return false;
  }
  if (form.jogadores.length !== 4) return false;
  return form.jogadores.every(
    (member) =>
      member.nome.trim() &&
      member.email.trim() &&
      member.instagram.trim() &&
      member.whatsapp.trim() &&
      member.nick.trim() &&
      member.eloAtual.trim() &&
      member.peakRanking.trim(),
  );
}

function buildFormData(form: FormacaoEditorForm, modalidade: GameSlug) {
  const formData = new FormData();
  formData.set("modalidade", modalidade);
  formData.set("payload", JSON.stringify(buildPayload(form, modalidade)));
  if (form.logoFile) {
    formData.set("logo", form.logoFile);
  }
  return formData;
}

export function createEmptyFormacaoForm() {
  return createBlankFormacaoForm();
}

export function createFormacaoFormFromSummary(formacao: VctFormacaoSummary) {
  return createFormacaoFormFromFormacao(formacao);
}

export function buildFormacaoEditorPayload(form: FormacaoEditorForm, modalidade: GameSlug) {
  return buildPayload(form, modalidade);
}

export function isFormacaoEditorFormComplete(form: FormacaoEditorForm) {
  return isValidForm(form);
}

export function VctFormacaoEditorDialog({
  open,
  mode,
  modalidade,
  formacao,
  onClose,
  onSaved,
}: VctFormacaoEditorDialogProps) {
  const initialForm = useMemo(
    () => (mode === "edit" && formacao ? createFormacaoFormFromFormacao(formacao) : createBlankFormacaoForm()),
    [formacao, mode],
  );
  const [form, setForm] = useState<FormacaoEditorForm>(initialForm);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
  }, [initialForm, open]);

  function updateMember(
    index: number,
    field: keyof FormacaoMemberForm,
    value: string,
  ) {
    setForm((current) => {
      if (!current) return current;
      if (index === 0) {
        return { ...current, capitao: { ...current.capitao, [field]: value } };
      }
      const nextPlayers = [...current.jogadores];
      nextPlayers[index - 1] = { ...nextPlayers[index - 1]!, [field]: value };
      return { ...current, jogadores: nextPlayers };
    });
  }

  function updateFormField(field: keyof Pick<FormacaoEditorForm, "nome" | "tag">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    if (!isValidForm(form)) {
      toast.error("Preencha nome, tag e todos os membros.");
      return;
    }

    setPending(true);
    try {
      const endpoint =
        mode === "create"
          ? `${getClientApiBaseUrl()}/vct/formacoes`
          : `${getClientApiBaseUrl()}/vct/formacoes/${formacao?._id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        body: buildFormData(form, modalidade),
        credentials: "include",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: true; formacao: VctFormacaoSummary }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !data || !("formacao" in data)) {
        const message =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : "Falha ao salvar a formação.";
        throw new Error(message);
      }

      onSaved(data.formacao);
      onClose();
      toast.success(mode === "create" ? "Formação criada." : "Formação atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar a formação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
    >
      <DialogContent className="!h-[min(92vh,980px)] !w-[min(96vw,1200px)] !max-w-none sm:!max-w-none overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Criar formação" : "Editar formação"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Crie uma formação com logo e cinco membros."
              : "Edite nome, tag, logo e membros da formação."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nome do time</span>
              <Input
                value={form.nome}
                onChange={(event) => updateFormField("nome", event.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tag</span>
              <Input
                value={form.tag}
                onChange={(event) => updateFormField("tag", event.target.value)}
              />
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Logo
                </p>
                <p className="text-xs text-muted-foreground">
                  {mode === "create" ? "Obrigatória no cadastro." : "Opcional na edição."}
                </p>
              </div>
            </div>
            {form.logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoPreview}
                alt=""
                className="h-40 w-full rounded-xl border border-border/60 object-contain bg-background"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background text-muted-foreground">
                Sem logo
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
              <UploadIcon className="size-4 text-muted-foreground" />
              <span className="flex-1">
                {form.logoFile ? form.logoFile.name : "Selecionar logo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm((current) => ({
                    ...current,
                    logoFile: file,
                    logoPreview: file ? URL.createObjectURL(file) : current.logoPreview,
                  }));
                }}
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Capitão
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(["nome", "email", "instagram", "whatsapp", "nick", "eloAtual", "peakRanking"] as const).map((field) => (
                <label key={field} className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{field}</span>
                  <Input
                    value={form.capitao[field]}
                    onChange={(event) => updateMember(0, field, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {form.jogadores.map((member, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Jogador {index + 1}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {(["nome", "email", "instagram", "whatsapp", "nick", "eloAtual", "peakRanking"] as const).map((field) => (
                    <label key={field} className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{field}</span>
                      <Input
                        value={member[field]}
                        onChange={(event) => updateMember(index + 1, field, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending} onClick={handleSubmit}>
            {pending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
            {mode === "create" ? "Criar formação" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
