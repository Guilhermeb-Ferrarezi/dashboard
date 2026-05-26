"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { MoonIcon, PlusIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

export type ProximaSessao = {
  id: number;
  data: string;
  totalVagas: number;
  status: "planejado" | "aberto" | "lotado" | "realizado" | "cancelado";
  observacoes: string | null;
  vagasVendidas: number;
  vagasRestantes: number;
};

type Props = {
  sessao: ProximaSessao | null;
  loading: boolean;
};

function formatDataLong(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  // T00:00:00 evita shift de dia em fuso GMT-3.
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "long"
  });
}

export function CorujaoProximaSessaoCard({ sessao, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 px-[var(--card-padding-x)] py-[var(--card-padding-y)]">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-7 w-64 mb-4" />
        <Skeleton className="h-12 w-40" />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-[var(--card-padding-x)] py-[var(--card-padding-y)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/60 p-2.5">
            <MoonIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhuma sessão planejada</p>
            <p className="text-xs text-muted-foreground">
              Crie a próxima noite pra ver as vagas aqui em cima.
            </p>
          </div>
        </div>
        <Link
          href="/corujao/sessoes"
          className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1.5"}
        >
          <PlusIcon className="h-4 w-4" />
          Criar sessão
        </Link>
      </div>
    );
  }

  const lotada = sessao.vagasVendidas >= sessao.totalVagas;
  const percent = Math.min(100, (sessao.vagasVendidas / sessao.totalVagas) * 100);

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-[var(--card-padding-x)] py-[var(--card-padding-y)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Próximo Corujão
          </p>
          <h2 className="text-xl font-semibold capitalize">
            {formatDataLong(sessao.data)}
          </h2>
          {sessao.observacoes && (
            <p className="text-sm text-muted-foreground mt-1">{sessao.observacoes}</p>
          )}
        </div>
        {lotada ? (
          <StatusBadge tone="amber">Lotado</StatusBadge>
        ) : (
          <StatusBadge tone="blue" className="capitalize">
            {sessao.status}
          </StatusBadge>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">
              {sessao.vagasVendidas}
            </span>
            <span className="text-lg text-muted-foreground">/ {sessao.totalVagas}</span>
            <span className="text-sm text-muted-foreground ml-1">vagas vendidas</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sessao.vagasRestantes > 0
              ? `${sessao.vagasRestantes} ${sessao.vagasRestantes === 1 ? "vaga restante" : "vagas restantes"}`
              : "Sem vagas restantes"}
          </p>
        </div>
        <Link
          href="/corujao/sessoes"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ver sessão
        </Link>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={`h-full transition-all ${
            lotada ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
