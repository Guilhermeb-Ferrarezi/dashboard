"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon, UserRoundIcon, XIcon } from "@/components/ui/icons";
import { clientApi } from "@/lib/api";

export const JOGOS_PREDEFINIDOS = [
  "Valorant",
  "Counter-Strike",
  "League of Legends",
  "Forza",
  "Resident Evil",
  "GTA",
] as const;

export const SERVICOS_OPTIONS = [
  { value: "corujao", label: "Corujão" },
  { value: "campeonato", label: "Campeonato" },
  { value: "locacao_hora", label: "Locação de hora" },
] as const;

export type Servico = (typeof SERVICOS_OPTIONS)[number]["value"];

type ContatoMinimo = {
  id: number;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  jogos: string[];
  servicos: string[];
};

type Props = {
  contato: ContatoMinimo | null;
  onClose: () => void;
  onUpdated: (contato: ContatoMinimo & Record<string, unknown>) => void;
};

function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function existeNaLista(tag: string, lista: string[]): boolean {
  const lower = tag.toLowerCase();
  return lista.some((t) => t.toLowerCase() === lower);
}

export function CorujaoFichaClienteDialog({ contato, onClose, onUpdated }: Props) {
  const [jogos, setJogos] = useState<string[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [jogosDisponiveis, setJogosDisponiveis] = useState<string[]>([]);
  const [novoJogo, setNovoJogo] = useState("");
  const [saving, setSaving] = useState(false);

  const open = contato !== null;

  useEffect(() => {
    if (contato) {
      setJogos(contato.jogos ?? []);
      setServicos((contato.servicos ?? []) as Servico[]);
      setNovoJogo("");
    }
  }, [contato]);

  useEffect(() => {
    if (!open) return;
    clientApi<{ jogos: string[] }>("/corujao/contatos/jogos")
      .then((res) => setJogosDisponiveis(res.jogos))
      .catch(() => setJogosDisponiveis([]));
  }, [open]);

  function toggleJogo(jogo: string) {
    setJogos((cur) =>
      existeNaLista(jogo, cur) ? cur.filter((j) => j.toLowerCase() !== jogo.toLowerCase()) : [...cur, jogo]
    );
  }

  function toggleServico(servico: Servico) {
    setServicos((cur) => (cur.includes(servico) ? cur.filter((s) => s !== servico) : [...cur, servico]));
  }

  function handleAddJogo() {
    const normalized = normalizeTag(novoJogo);
    if (!normalized) return;
    if (existeNaLista(normalized, jogos)) {
      toast.error("Esse jogo já foi adicionado.");
      return;
    }
    setJogos((cur) => [...cur, normalized]);
    setNovoJogo("");
  }

  async function handleSave() {
    if (!contato) return;
    setSaving(true);
    try {
      const res = await clientApi<{ contato: ContatoMinimo & Record<string, unknown> }>(
        `/corujao/contatos/${contato.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ jogos, servicos }),
        }
      );
      toast.success("Ficha atualizada.");
      onUpdated(res.contato);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // União dos predefinidos + cadastrados + atuais — pra mostrar todos como chips.
  const todosJogos = (() => {
    const set = new Map<string, string>();
    for (const j of JOGOS_PREDEFINIDOS) set.set(j.toLowerCase(), j);
    for (const j of jogosDisponiveis) if (!set.has(j.toLowerCase())) set.set(j.toLowerCase(), j);
    for (const j of jogos) if (!set.has(j.toLowerCase())) set.set(j.toLowerCase(), j);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  })();

  if (!contato) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                <UserRoundIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{contato.nome ?? "—"}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {contato.telefone ?? "Sem telefone"}
                  {contato.email ? ` · ${contato.email}` : ""}
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Jogos</Label>
            <div className="flex flex-wrap gap-1.5">
              {todosJogos.map((jogo) => {
                const ativo = existeNaLista(jogo, jogos);
                return (
                  <button
                    key={jogo}
                    type="button"
                    onClick={() => toggleJogo(jogo)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                      ativo
                        ? "border-foreground/60 bg-foreground/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {jogo}
                    {ativo && <XIcon className="size-3 opacity-60" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <Input
                value={novoJogo}
                onChange={(e) => setNovoJogo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddJogo();
                  }
                }}
                placeholder="Adicionar jogo novo…"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddJogo}
                disabled={!normalizeTag(novoJogo)}
                className="h-8 gap-1"
              >
                <PlusIcon className="size-3.5" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipos de serviço</Label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICOS_OPTIONS.map((opt) => {
                const ativo = servicos.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleServico(opt.value)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                      ativo
                        ? "border-foreground/60 bg-foreground/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                    {ativo && <XIcon className="size-3 opacity-60" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
