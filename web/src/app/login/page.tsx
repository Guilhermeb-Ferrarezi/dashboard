"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthLoginUrl } from "@/lib/auth-api";
import { getClientApiBaseUrl } from "@/lib/api";

// Em produção: delega 100% pro auth externo (auth.santos-games.com).
// Em dev: mostra um formulário simples que chama POST /api/dev/login.
// Esse bypass de dev pode ser removido quando o auth externo aceitar localhost.
const IS_DEV = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");
  const [username, setUsername] = useState("Henrique");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEV) return;
    if (denied) {
      window.location.href = "https://santos-games.com";
    } else {
      window.location.href = getAuthLoginUrl();
    }
  }, [denied]);

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getClientApiBaseUrl()}/dev/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        throw new Error(data.message || "Falha no login dev.");
      }
      // Seta o cookie no domínio do frontend (localhost:3001) pra o SSR do
      // Next.js conseguir ler. Em dev sem httpOnly — é OK pq é só local.
      const maxAge = Number(data.maxAgeSeconds) || 7 * 24 * 60 * 60;
      const cookieName = String(data.cookieName || "sga_auth");
      document.cookie = `${cookieName}=${encodeURIComponent(data.token)}; path=/; max-age=${maxAge}; samesite=lax`;
      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao logar.");
      setSubmitting(false);
    }
  }

  if (!IS_DEV) return null;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card/90 p-6 shadow-xl">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
          Dev Login (apenas localhost)
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight mb-1">
          Entrar como
        </h1>
        <p className="text-xs text-muted-foreground mb-4">
          Login local sem passar pelo auth externo. Use o username de um admin
          que já existe no Mongo.
        </p>

        <form onSubmit={handleDevLogin} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-[10px] text-muted-foreground/70 text-center">
          Esse bypass só funciona em NODE_ENV != production.
        </p>
      </div>
    </div>
  );
}
