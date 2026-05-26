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
import { Trash2Icon } from "@/components/ui/icons";
import { clientApi } from "@/lib/api";

type ContatoMin = {
  id: number;
  nome: string | null;
  telefone: string | null;
};

interface Props {
  contato: ContatoMin | null;
  onClose: () => void;
  onDeleted: (deletedId: number) => void;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

type Stats = { visitasCount: number; receitaCents: number };

/**
 * Dialog reutilizável de confirmação de DELETE contato.
 *
 * Quando o contato passa de null → objeto, faz GET das visitas pra
 * calcular impacto. Mostra aviso forte quando há visitas (cascade vai
 * apagar visitas + receita histórica junto).
 */
export function CorujaoDeleteContatoDialog({ contato, onClose, onDeleted }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!contato) {
      setStats(null);
      return;
    }
    setLoadingStats(true);
    setStats(null);
    clientApi<{ visitas: { id: number; amountCents: number; formaPagamento: string }[] }>(
      `/corujao/contatos/${contato.id}/visitas`,
    )
      .then((res) => {
        const receita = res.visitas.reduce(
          (sum, v) => sum + (v.formaPagamento === "cortesia" ? 0 : v.amountCents),
          0,
        );
        setStats({ visitasCount: res.visitas.length, receitaCents: receita });
      })
      .catch(() => {
        // Não bloqueia o fluxo — apenas não mostra o aviso forte.
        setStats({ visitasCount: 0, receitaCents: 0 });
      })
      .finally(() => setLoadingStats(false));
  }, [contato]);

  async function confirmDelete() {
    if (!contato || deleting) return;
    setDeleting(true);
    try {
      const res = await clientApi<{
        deletedId: number;
        visitasRemovidas: number;
        receitaRemovidaCents: number;
      }>(`/corujao/contatos/${contato.id}`, { method: "DELETE" });

      const msg =
        res.visitasRemovidas > 0
          ? `Contato + ${res.visitasRemovidas} visita${res.visitasRemovidas === 1 ? "" : "s"} apagado${res.visitasRemovidas === 1 ? "" : "s"}. ${formatBRL(res.receitaRemovidaCents)} removido${res.receitaRemovidaCents === 0 ? "" : "s"} do histórico.`
          : "Contato apagado.";
      toast.success(msg);
      onDeleted(res.deletedId);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao apagar contato."));
    } finally {
      setDeleting(false);
    }
  }

  const open = contato !== null;
  const nome = contato?.nome ?? contato?.telefone ?? (contato ? `Contato #${contato.id}` : "");
  const hasVisitas = (stats?.visitasCount ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !deleting) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar contato?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-foreground">{nome}</span>. Esta ação é irreversível.
          </p>
          {loadingStats ? (
            <p className="text-xs text-muted-foreground">Verificando histórico…</p>
          ) : hasVisitas && stats ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-amber-400">
              <p>
                <strong>Atenção:</strong> este contato tem{" "}
                <strong>{stats.visitasCount}</strong> visita
                {stats.visitasCount === 1 ? "" : "s"} registrada
                {stats.visitasCount === 1 ? "" : "s"}
                {stats.receitaCents > 0 ? (
                  <>
                    , totalizando <strong>{formatBRL(stats.receitaCents)}</strong> em receita histórica
                  </>
                ) : null}
                . Apagar vai remover essas visitas e a receita junto.
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleting || loadingStats}
          >
            <Trash2Icon className="size-4" />
            {deleting ? "Apagando…" : "Apagar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
