"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function buildTokenStatusText(active: boolean) {
  return active ? "Ativo" : "Gerenciado pelo sistema";
}

export function CodexAccessPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Acesso Codex</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O chat usa uma credencial delegada criada e mantida pelo sistema.
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]",
              "border border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            {buildTokenStatusText(false)}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Nao existe mais criacao manual de token por admin para liberar o chat.
          </p>
          <p>
            Se o drawer mostrar <span className="font-medium text-foreground">Conectar ChatGPT</span>, o que falta e apenas autenticar a conta compartilhada do agente.
          </p>
          <p>
            Depois dessa conexao, os admins continuam com conversas separadas, mas a conta operacional do Codex permanece a mesma no servidor.
          </p>
        </div>
      </div>
    </div>
  );
}
