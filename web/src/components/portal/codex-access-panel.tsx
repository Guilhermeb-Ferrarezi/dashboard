"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowsClockwise, Copy, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { clientApi } from "@/lib/api";
import {
  clearCodexAccessTokenCookie,
  setCodexAccessTokenCookie,
} from "@/lib/codex-access";
import { cn } from "@/lib/utils";
import type { AdminAccessTokenSummary } from "@/types/admin-access-token";

type AdminAccessTokenListResponse = {
  ok: true;
  tokens: AdminAccessTokenSummary[];
};

type AdminAccessTokenCreateResponse = {
  ok: true;
  tokenId: string;
  token: string;
  type: string;
  label: string;
};

type AdminAccessTokenRevokeResponse = {
  ok: true;
  revoked: true;
  tokenId: string;
};

export function buildTokenStatusText(active: boolean) {
  return active ? "Ativo" : "Gerenciado pelo sistema";
}

function isActiveToken(token: AdminAccessTokenSummary) {
  return token.type === "codex" && token.revokedAt === null;
}

function formatTokenDate(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CodexAccessPanel() {
  const [tokens, setTokens] = useState<AdminAccessTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState("Codex");
  const [revealedToken, setRevealedToken] = useState<{
    id: string;
    value: string;
    label: string;
  } | null>(null);

  const activeCodexToken = useMemo(
    () => tokens.find((token) => isActiveToken(token)) ?? null,
    [tokens],
  );

  useEffect(() => {
    if (!loading && !activeCodexToken) {
      clearCodexAccessTokenCookie();
    }
  }, [activeCodexToken, loading]);

  async function loadTokens() {
    setLoading(true);

    try {
      const response = await clientApi<AdminAccessTokenListResponse>("/admin/tokens");
      setTokens(response.tokens);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel carregar os tokens.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTokens();
  }, []);

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const response = await clientApi<AdminAccessTokenCreateResponse>("/admin/tokens", {
        method: "POST",
        body: JSON.stringify({
          type: "codex",
          label: label.trim() || "Codex",
        }),
      });

      setRevealedToken({
        id: response.tokenId,
        value: response.token,
        label: response.label,
      });
      setCodexAccessTokenCookie(response.token);
      await loadTokens();
      window.dispatchEvent(new Event("codex-access-updated"));
      toast.success("Token de acesso criado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel criar o token.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleRevokeToken(tokenId: string) {
    setPending(true);

    try {
      await clientApi<AdminAccessTokenRevokeResponse>(`/admin/tokens/${tokenId}/revoke`, {
        method: "POST",
      });
      clearCodexAccessTokenCookie();
      await loadTokens();
      window.dispatchEvent(new Event("codex-access-updated"));
      toast.success("Token revogado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel revogar o token.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copyToken(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Token copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o token.");
    }
  }

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
            variant={activeCodexToken ? "default" : "secondary"}
            className={cn(
              "rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]",
              !activeCodexToken && "border border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            {buildTokenStatusText(Boolean(activeCodexToken))}
          </Badge>
        </div>

        <Separator className="my-4" />

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCreateToken}>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Nome do token</span>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Codex"
              minLength={2}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending || loading} className="gap-2">
              {pending ? <ArrowsClockwise className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar token
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Tokens cadastrados</h4>
            <p className="text-sm text-muted-foreground">
              O valor bruto aparece apenas no momento da criacao.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadTokens()} disabled={loading}>
            <ArrowsClockwise className={cn("size-4", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Carregando tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Nenhum token ativo ainda.
            </div>
          ) : (
            tokens.map((token) => {
              const active = isActiveToken(token);

              return (
                <div
                  key={token.id}
                  className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{token.label}</p>
                      <Badge variant={active ? "default" : "secondary"}>{token.type}</Badge>
                      <Badge variant={active ? "default" : "destructive"}>
                        {active ? "Ativo" : "Revogado"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criado em {formatTokenDate(token.createdAt)}. Ultimo uso {formatTokenDate(token.lastUsedAt)}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!active || pending}
                      onClick={() => void handleRevokeToken(token.id)}
                    >
                      <Trash className="size-4" />
                      Revogar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(revealedToken)}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedToken(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Token criado</DialogTitle>
            <DialogDescription>
              Copie agora. Depois de fechar esta janela, o valor nao sera exibido novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {revealedToken?.label}
              </p>
              <code className="mt-2 block break-all rounded-md bg-background px-3 py-2 text-sm">
                {revealedToken?.value}
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => revealedToken && void copyToken(revealedToken.value)}
            >
              <Copy className="size-4" />
              Copiar token
            </Button>
            <Button type="button" onClick={() => setRevealedToken(null)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
