import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--primary)_22%,transparent)_0%,_transparent_38%)]" />
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Erro 404
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Página não encontrada
            </h1>
            <p className="text-sm text-muted-foreground">
              O endereço que você abriu não existe ou foi movido. Tente voltar
              para a página inicial ou usar a busca rápida.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button render={<Link href="/painel" />}>
              <ArrowLeftIcon className="size-4" />
              Voltar para o início
            </Button>
            <Button variant="outline" render={<Link href="/painel" aria-label="Abrir busca" />}>
              <SearchIcon className="size-4" />
              Buscar conteúdo
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
