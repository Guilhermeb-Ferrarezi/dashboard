"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, RefreshCwIcon, TriangleAlertIcon } from "@/components/ui/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--destructive)_22%,transparent)_0%,_transparent_40%)]" />
      <Card className="w-full max-w-md border-border/60 bg-card/92 shadow-2xl shadow-black/25 backdrop-blur">
        <CardContent className="flex flex-col items-center gap-5 px-8 py-10 text-center">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background/60">
            <img
              src="/assets/Logo.png"
              alt="Santos Tech"
              width={48}
              height={48}
              className="size-12 object-contain"
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-destructive">
              <TriangleAlertIcon className="inline size-3.5 -translate-y-px" /> Erro inesperado
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Algo deu errado por aqui
            </h1>
            <p className="text-sm text-muted-foreground">
              A página não pôde ser renderizada. Tente recarregar — se o problema
              persistir, copie o código do erro e envie para o time técnico.
            </p>
            {error.digest ? (
              <p className="rounded-md bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                ref: <span className="text-foreground">{error.digest}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button type="button" onClick={() => reset()}>
              <RefreshCwIcon className="size-4" />
              Tentar de novo
            </Button>
            <Button variant="outline" render={<Link href="/painel" />}>
              <ArrowLeftIcon className="size-4" />
              Voltar para o início
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
