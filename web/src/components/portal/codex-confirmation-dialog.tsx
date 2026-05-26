"use client";

import { AlertCircleIcon } from "@/components/ui/icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CodexConfirmationRequest } from "@/types/codex";

interface CodexConfirmationDialogProps {
  request: CodexConfirmationRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onDeny: () => void;
}

export function CodexConfirmationDialog({
  request,
  open,
  onOpenChange,
  onApprove,
  onDeny,
}: CodexConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-300">
              <AlertCircleIcon className="size-5" />
            </div>
            <div>
              <DialogTitle>Confirmar ação do agente</DialogTitle>
              <DialogDescription>
                O Codex quer continuar com uma ação que pode alterar estado ou recursos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {request ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Pedido
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {request.prompt}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Risco {request.riskLevel}</Badge>
              {request.reasons.map((reason) => (
                <Badge key={reason} className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDeny}>
            Cancelar
          </Button>
          <Button type="button" onClick={onApprove}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
