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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const MENSAGEM_STORAGE_KEY = "corujao:mensagem-chamar";

// Lê a mensagem salva. SSR-safe: retorna "" no servidor.
export function readMensagemChamar(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(MENSAGEM_STORAGE_KEY) ?? "";
}

// Aplica a variável {nome} no template. Se contato não tem nome, usa "cliente".
export function applyMensagemVariables(template: string, contato: { nome: string | null }): string {
  const nome = contato.nome?.trim() || "cliente";
  return template.replaceAll("{nome}", nome);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CorujaoMensagemDialog({ open, onOpenChange }: Props) {
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");

  useEffect(() => {
    if (open) {
      const stored = readMensagemChamar();
      setValue(stored);
      setInitial(stored);
    }
  }, [open]);

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed) {
      window.localStorage.setItem(MENSAGEM_STORAGE_KEY, trimmed);
      toast.success("Mensagem padrão salva.");
    } else {
      window.localStorage.removeItem(MENSAGEM_STORAGE_KEY);
      toast.success("Mensagem padrão removida.");
    }
    onOpenChange(false);
  }

  function handleClear() {
    setValue("");
  }

  const dirty = value !== initial;
  const charCount = value.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensagem padrão pro WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Essa mensagem vai aparecer pré-preenchida toda vez que clicar em "Chamar".
            Use <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded">{"{nome}"}</code> pra inserir o nome do contato automaticamente.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="mensagem-template">Template</Label>
            <Textarea
              id="mensagem-template"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: Oi {nome}! Tô passando pra te chamar pro Corujão temático de Forza Horizon 6 amanhã. Tenho um cupom de 20% se quiser garantir sua vaga 🎮"
              rows={6}
              className="text-sm resize-none"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Salva apenas neste navegador.</span>
              <span className="tabular-nums">{charCount} caracteres</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClear} disabled={!value}>
            Limpar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!dirty}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
