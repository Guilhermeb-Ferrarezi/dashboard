"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserAccessTokenSummary, UserAccessTokenType } from "@/types/user-access-token";

type UserAccessTokenResponse = {
  ok: true;
  tokens: UserAccessTokenSummary[];
};

type CreateTokenResponse = {
  ok: true;
  tokenId: string;
  token: string;
  label: string;
  type: UserAccessTokenType;
};

const TOKEN_MODES: Array<{
  id: UserAccessTokenType;
  label: string;
  description: string;
}> = [
  {
    id: "account",
    label: "Normal",
    description: "Token de conta",
  },
  {
    id: "codex",
    label: "Codex",
    description: "Token do Codex",
  },
];

export function buildTokenStatusText(active: boolean) {
  return active ? "Ativo" : "Gerenciado pelo sistema";
}

function getModeTitle(mode: UserAccessTokenType) {
  return mode === "codex" ? "Token do Codex" : "Token de conta";
}

function getModeButtonLabel(mode: UserAccessTokenType) {
  return mode === "codex" ? "Gerar token do Codex" : "Gerar token de conta";
}

function getModePlaceholder(mode: UserAccessTokenType) {
  return mode === "codex" ? "Codex" : "Minha conta";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TokenRow({
  token,
  onRevoke,
  revoking,
}: {
  token: UserAccessTokenSummary;
  onRevoke: (tokenId: string) => void;
  revoking: boolean;
}) {
  const isRevoked = Boolean(token.revokedAt);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{token.label}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Criado em {formatDateTime(token.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            Ultimo uso: {formatDateTime(token.lastUsedAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isRevoked ? "outline" : "secondary"}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
              isRevoked
                ? "border-border text-muted-foreground"
                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {isRevoked ? "Revogado" : "Ativo"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRevoke(token.id)}
            disabled={isRevoked || revoking}
          >
            {revoking ? <Spinner size="sm" /> : <Trash2Icon className="size-3.5" />}
            Revogar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CodexAccessPanel() {
  const [activeMode, setActiveMode] = useState<UserAccessTokenType>("account");
  const [tokens, setTokens] = useState<UserAccessTokenSummary[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [creatingToken, setCreatingToken] = useState(false);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);
  const [tokenLabel, setTokenLabel] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadTokens(mode: UserAccessTokenType = activeMode) {
    setLoadingTokens(true);

    try {
      const response = await clientApi<UserAccessTokenResponse>(`/user/tokens?type=${mode}`);
      setTokens(response.tokens);
    } catch {
      toast.error("Nao foi possivel carregar seus tokens.");
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    void loadTokens(activeMode);
    setCreatedToken("");
    setCopied(false);
  }, [activeMode]);

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const label = tokenLabel.trim() || getModeTitle(activeMode);

    setCreatingToken(true);
    setCopied(false);

    try {
      const response = await clientApi<CreateTokenResponse>("/user/tokens", {
        method: "POST",
        body: JSON.stringify({ label, type: activeMode }),
      });

      setCreatedToken(response.token);
      setTokenLabel("");
      toast.success("Token criado.");
      await loadTokens(activeMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o token.");
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleCopyToken() {
    if (!createdToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      toast.success("Token copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o token.");
    }
  }

  async function handleRevokeToken(tokenId: string) {
    setRevokingTokenId(tokenId);

    try {
      await clientApi<{ ok: true; revoked: true; tokenId: string }>(
        `/user/tokens/${encodeURIComponent(tokenId)}/revoke`,
        {
          method: "POST",
        },
      );

      toast.success("Token revogado.");
      await loadTokens(activeMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel revogar o token.");
    } finally {
      setRevokingTokenId(null);
    }
  }

  const currentModeMeta = TOKEN_MODES.find((mode) => mode.id === activeMode) ?? TOKEN_MODES[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-5 shadow-[0_1px_0_rgba(255,255,255,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">Acesso Codex</h3>
            <p className="text-sm text-muted-foreground">
              Selecione um modo e gere o token para usar na API.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TOKEN_MODES.map((mode) => {
            const active = activeMode === mode.id;

            return (
              <Button
                key={mode.id}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMode(mode.id)}
                className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
              >
                <span>{mode.label}</span>
                <span className="text-[11px] font-normal opacity-80">{mode.description}</span>
              </Button>
            );
          })}
        </div>

        <Separator className="my-4" />

        <form className="space-y-3" onSubmit={handleCreateToken}>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Nome do token
              </span>
              <Input
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
                placeholder={getModePlaceholder(activeMode)}
                maxLength={80}
              />
            </label>

            <Button type="submit" size="lg" disabled={creatingToken}>
              {creatingToken ? <Spinner size="md" /> : <PlusIcon className="size-4" />}
              {getModeButtonLabel(activeMode)}
            </Button>
          </div>

          {activeMode === "codex" ? (
            <p className="text-xs text-muted-foreground">
              O modo Codex mantém apenas um token ativo por vez.
            </p>
          ) : null}
        </form>

        {createdToken ? (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {getModeTitle(activeMode)} gerado
                </p>
                <p className="text-xs text-muted-foreground">
                  Copie agora. Este valor nao volta a ser exibido.
                </p>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyToken()}>
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs break-all text-foreground">
              {createdToken}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{currentModeMeta.label}</h4>
            <p className="text-xs text-muted-foreground">
              {currentModeMeta.description}
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => void loadTokens()}>
            <RefreshCwIcon className="size-3.5" />
            Atualizar
          </Button>
        </div>

        <div className="space-y-3">
          {loadingTokens ? (
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              Carregando tokens...
            </div>
          ) : tokens.length ? (
            tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onRevoke={handleRevokeToken}
                revoking={revokingTokenId === token.id}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Nenhum token foi criado neste modo ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
