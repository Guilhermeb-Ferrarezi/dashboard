"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AUTH_SESSIONS_URL, getAuthLoginUrl } from "@/lib/auth-api";
import { formatDateTime } from "@/lib/format";

type Session = {
  id: number;
  deviceLabel: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
};

async function authFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = getAuthLoginUrl();
  }
  return res;
}

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconhecido";
  const ua = userAgent.toLowerCase();
  let os = "desconhecido";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os x") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  let browser = "navegador";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("chrome/")) browser = "Chrome";
  else if (ua.includes("safari/")) browser = "Safari";

  return `${browser} no ${os}`;
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(AUTH_SESSIONS_URL);
      if (!res.ok) throw new Error("Falha ao carregar sessões");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      toast.error("Não foi possível carregar suas sessões");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function revokeOne(id: number) {
    startTransition(async () => {
      const res = await authFetch(`${AUTH_SESSIONS_URL}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Sessão desconectada");
        await load();
      } else {
        toast.error("Falha ao desconectar sessão");
      }
    });
  }

  function revokeOthers() {
    startTransition(async () => {
      const res = await authFetch(`${AUTH_SESSIONS_URL}/revoke-others`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.revoked} sessões desconectadas`);
        await load();
      } else {
        toast.error("Falha ao desconectar outras sessões");
      }
    });
  }

  function revokeAll() {
    if (!confirm("Desconectar TODAS as sessões, incluindo esta? Você será deslogado.")) return;
    startTransition(async () => {
      const res = await authFetch(`${AUTH_SESSIONS_URL}/revoke-all`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Todas as sessões desconectadas");
        window.location.href = getAuthLoginUrl();
      } else {
        toast.error("Falha ao desconectar todas as sessões");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return <EmptyState title="Nenhuma sessão ativa" description="Você não tem sessões registradas." />;
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "sessão ativa" : "sessões ativas"}
        </p>
        <div className="flex flex-wrap gap-2">
          {others.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={revokeOthers}
              disabled={isPending}
            >
              Desconectar outras ({others.length})
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={revokeAll}
            disabled={isPending}
          >
            Desconectar todas
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  {describeDevice(session.userAgent)}
                  {session.current && (
                    <Badge variant="secondary" className="text-[10px]">
                      Esta sessão
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {session.ip ?? "IP desconhecido"} · Criada em {formatDateTime(session.createdAt)}
                </p>
                {session.lastUsedAt && (
                  <p className="text-xs text-muted-foreground">
                    Último uso: {formatDateTime(session.lastUsedAt)}
                  </p>
                )}
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeOne(session.id)}
                  disabled={isPending}
                >
                  Desconectar
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {session.userAgent ?? "User agent indisponível"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
