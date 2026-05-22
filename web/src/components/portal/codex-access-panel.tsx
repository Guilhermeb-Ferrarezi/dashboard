"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  TokenUsageEntry,
  UserAccessTokenSummary,
  UserAccessTokenType,
} from "@/types/user-access-token";
import {
  SCOPE_GROUPS,
  SCOPE_LABELS,
  SCOPE_PRESETS,
} from "@/types/token-permissions";

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

type TokenUsageResponse = {
  ok: true;
  logs: TokenUsageEntry[];
};

const TOKEN_MODES: Array<{
  id: UserAccessTokenType;
  label: string;
  description: string;
}> = [
  { id: "account", label: "Normal", description: "Token de conta" },
  { id: "codex",   label: "Codex",  description: "Token do Codex" },
];

function getModeButtonLabel(mode: UserAccessTokenType) {
  return mode === "codex" ? "Gerar token do Codex" : "Gerar token de conta";
}

function getModePlaceholder(mode: UserAccessTokenType) {
  return mode === "codex" ? "Codex" : "Minha conta";
}

function getModeTitle(mode: UserAccessTokenType) {
  return mode === "codex" ? "Token do Codex" : "Token de conta";
}

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

// ——— Permission selector ————————————————————————————————————————————————

function PermissionSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  function toggle(scope: string) {
    if (selected.includes(scope)) {
      onChange(selected.filter((s) => s !== scope));
    } else {
      onChange([...selected, scope]);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {Object.entries(SCOPE_GROUPS).map(([key, { label, scopes }]) => (
        <div key={key}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <div className="flex flex-wrap gap-2">
            {scopes.map((scope) => {
              const active = selected.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggle(scope)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                  )}
                >
                  {SCOPE_LABELS[scope] ?? scope}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ——— Scope badges (compact) —————————————————————————————————————————————

const MAX_VISIBLE_SCOPES = 3;

function ScopeBadges({ permissions }: { permissions: string[] }) {
  if (permissions.length === 0) {
    return (
      <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-medium">
        Acesso total
      </Badge>
    );
  }

  const visible = permissions.slice(0, MAX_VISIBLE_SCOPES);
  const extra = permissions.length - MAX_VISIBLE_SCOPES;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((s) => (
        <Badge key={s} variant="outline" className="rounded-full px-2 py-0 text-[10px] font-mono font-normal">
          {s}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] text-muted-foreground">
          +{extra}
        </Badge>
      )}
    </div>
  );
}

// ——— Expiry badge ————————————————————————————————————————————————————————

function ExpiryBadge({
  expiresAt,
  isExpiringSoon,
  isExpired,
}: {
  expiresAt: string | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
}) {
  if (!expiresAt) return null;

  if (isExpired) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <TriangleAlertIcon className="size-3.5" />
        Expirado
      </span>
    );
  }

  if (isExpiringSoon) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <TriangleAlertIcon className="size-3.5" />
        Expira {formatDateOnly(expiresAt)}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <CalendarIcon className="size-3.5" />
      Expira {formatDateOnly(expiresAt)}
    </span>
  );
}

// ——— Usage log section ———————————————————————————————————————————————————

function UsageLogSection({ tokenId }: { tokenId: string }) {
  const [logs, setLogs] = useState<TokenUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await clientApi<TokenUsageResponse>(
          `/user/tokens/${encodeURIComponent(tokenId)}/usage?limit=10`,
        );
        setLogs(res.logs);
      } catch {
        toast.error("Não foi possível carregar o histórico.");
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Spinner size="sm" /> Carregando histórico...
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">Nenhum uso registrado.</p>;
  }

  return (
    <div className="mt-2 space-y-1">
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
        >
          <span className="font-mono font-medium text-foreground">
            {entry.method} {entry.path}
          </span>
          <span className="shrink-0 text-muted-foreground">{formatDateTime(entry.usedAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ——— Token row ————————————————————————————————————————————————————————————

function TokenRow({
  token,
  onRevoke,
  revoking,
}: {
  token: UserAccessTokenSummary;
  onRevoke: (tokenId: string) => void;
  revoking: boolean;
}) {
  const [showUsage, setShowUsage] = useState(false);
  const isRevoked = Boolean(token.revokedAt);
  const isExpired = token.isExpired && !isRevoked;

  function statusBadge() {
    if (isRevoked) {
      return (
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] border-border text-muted-foreground"
        >
          Revogado
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] border-destructive/30 bg-destructive/10 text-destructive"
        >
          Expirado
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      >
        Ativo
      </Badge>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-semibold">{token.label}</p>
          </div>

          {token.description ? (
            <p className="text-xs text-muted-foreground">{token.description}</p>
          ) : null}

          <ScopeBadges permissions={token.permissions} />

          <div className="flex flex-wrap items-center gap-3">
            <ExpiryBadge
              expiresAt={token.expiresAt}
              isExpiringSoon={token.isExpiringSoon}
              isExpired={token.isExpired}
            />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Último uso: {formatDateTime(token.lastUsedAt)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Criado em {formatDateTime(token.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusBadge()}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUsage((v) => !v)}
            className="text-muted-foreground"
          >
            {showUsage ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
            Histórico
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRevoke(token.id)}
            disabled={isRevoked || isExpired || revoking}
          >
            {revoking ? <Spinner size="sm" /> : <Trash2Icon className="size-3.5" />}
            Revogar
          </Button>
        </div>
      </div>

      {showUsage ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Últimos usos</p>
          <UsageLogSection tokenId={token.id} />
        </div>
      ) : null}
    </div>
  );
}

// ——— Main panel ——————————————————————————————————————————————————————————

type PermissionPresetId = "full-access" | "read-only" | "read-write" | "custom";

export function buildTokenStatusText(active: boolean) {
  return active ? "Ativo" : "Gerenciado pelo sistema";
}

export function CodexAccessPanel() {
  const [activeMode, setActiveMode] = useState<UserAccessTokenType>("account");
  const [tokens, setTokens] = useState<UserAccessTokenSummary[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [creatingToken, setCreatingToken] = useState(false);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);

  // form
  const [tokenLabel, setTokenLabel] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [presetId, setPresetId] = useState<PermissionPresetId>("full-access");
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  function resolvedPermissions(): string[] {
    if (presetId === "full-access") return [];
    if (presetId === "read-only")  return ["*:read"];
    if (presetId === "read-write") return ["*:read", "*:write"];
    return customPermissions;
  }

  function handlePresetChange(id: PermissionPresetId) {
    setPresetId(id);
  }

  async function loadTokens(mode: UserAccessTokenType = activeMode) {
    setLoadingTokens(true);

    try {
      const response = await clientApi<UserAccessTokenResponse>(`/user/tokens?type=${mode}`);
      setTokens(response.tokens);
    } catch {
      toast.error("Não foi possível carregar seus tokens.");
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    void loadTokens(activeMode);
    setCreatedToken("");
    setCopied(false);
    // loadTokens é estável entre renders; activeMode é a dependência real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const label = tokenLabel.trim() || getModeTitle(activeMode);

    setCreatingToken(true);
    setCopied(false);

    try {
      const response = await clientApi<CreateTokenResponse>("/user/tokens", {
        method: "POST",
        body: JSON.stringify({
          label,
          type: activeMode,
          permissions: resolvedPermissions(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          description: description.trim() || undefined,
        }),
      });

      setCreatedToken(response.token);
      setTokenLabel("");
      setDescription("");
      setExpiresAt("");
      setPresetId("full-access");
      setCustomPermissions([]);
      toast.success("Token criado.");
      await loadTokens(activeMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o token.");
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleCopyToken() {
    if (!createdToken) return;

    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      toast.success("Token copiado.");
    } catch {
      toast.error("Não foi possível copiar o token.");
    }
  }

  async function handleRevokeToken(tokenId: string) {
    setRevokingTokenId(tokenId);

    try {
      await clientApi<{ ok: true; revoked: true; tokenId: string }>(
        `/user/tokens/${encodeURIComponent(tokenId)}/revoke`,
        { method: "POST" },
      );

      toast.success("Token revogado.");
      await loadTokens(activeMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível revogar o token.");
    } finally {
      setRevokingTokenId(null);
    }
  }

  const currentModeMeta = TOKEN_MODES.find((m) => m.id === activeMode) ?? TOKEN_MODES[0];

  return (
    <div className="space-y-4">
      {/* ——— Painel de criação ——— */}
      <div className="rounded-2xl border border-border bg-background p-5 shadow-[0_1px_0_rgba(255,255,255,0.45)]">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">Acesso por Token</h3>
          <p className="text-sm text-muted-foreground">
            Crie tokens com escopos e validade controlados.
          </p>
        </div>

        {/* Seletor de modo */}
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

        <form className="space-y-4" onSubmit={handleCreateToken}>
          {/* Nome + botão */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Nome do token
              </span>
              <Input
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                placeholder={getModePlaceholder(activeMode)}
                maxLength={80}
              />
            </label>

            <Button type="submit" size="lg" disabled={creatingToken}>
              {creatingToken ? <Spinner size="md" /> : <PlusIcon className="size-4" />}
              {getModeButtonLabel(activeMode)}
            </Button>
          </div>

          {/* Descrição */}
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Descrição (opcional)
            </span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Usado pelo pipeline de CI"
              maxLength={500}
            />
          </label>

          {/* Permissões */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Permissões
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {SCOPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id as PermissionPresetId)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                    presetId === preset.id
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                  )}
                >
                  <p className="font-semibold">{preset.label}</p>
                  <p className="opacity-75">{preset.description}</p>
                </button>
              ))}
            </div>

            {presetId === "custom" ? (
              <PermissionSelector
                selected={customPermissions}
                onChange={setCustomPermissions}
              />
            ) : null}
          </div>

          {/* Data de validade */}
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Expira em (opcional)
            </span>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-fit"
            />
          </label>

          {activeMode === "codex" ? (
            <p className="text-xs text-muted-foreground">
              O modo Codex mantém apenas um token ativo por vez.
            </p>
          ) : null}
        </form>

        {/* Token recém-criado */}
        {createdToken ? (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {getModeTitle(activeMode)} gerado
                </p>
                <p className="text-xs text-muted-foreground">
                  Copie agora. Este valor não volta a ser exibido.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopyToken()}
              >
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

      {/* ——— Lista de tokens ——— */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{currentModeMeta.label}</h4>
            <p className="text-xs text-muted-foreground">{currentModeMeta.description}</p>
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
