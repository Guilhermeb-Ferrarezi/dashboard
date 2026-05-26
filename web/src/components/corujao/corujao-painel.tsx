"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckIcon, MoonIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { clientApi } from "@/lib/api";

type StatusSessao = "planejado" | "aberto" | "lotado" | "realizado" | "cancelado";

type Painel = {
  periodo: { from: string; to: string; label: string };
  totais: {
    vendasCount: number;
    receitaCents: number;
    ticketMedioCents: number;
    sessoesRealizadas: number;
    vagasOfertadas: number;
    vagasOcupadas: number;
    taxaOcupacao: number;
  };
  porColaborador: { id: number | null; nome: string; vendas: number; receitaCents: number }[];
  sessoesNoPeriodo: {
    id: number;
    data: string;
    status: StatusSessao;
    totalVagas: number;
    vagasOcupadas: number;
    receitaCents: number;
    observacoes: string | null;
  }[];
};

type PeriodoChip = "mes" | "semana" | "todos" | "custom";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function formatPct(taxa: number): string {
  return `${Math.round(taxa * 100)}%`;
}

function formatDataCurta(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short"
  });
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

function statusToTone(status: StatusSessao): StatusBadgeTone {
  switch (status) {
    case "realizado":
      return "emerald";
    case "aberto":
      return "blue";
    case "lotado":
      return "amber";
    case "cancelado":
      return "red";
    case "planejado":
    default:
      return "muted";
  }
}

function KpiCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-[var(--card-padding-x)] py-[var(--card-padding-y)]">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card/40 px-[var(--card-padding-x)] py-[var(--card-padding-y)]">
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

const PERIODO_CHIPS: { key: PeriodoChip; label: string }[] = [
  { key: "mes", label: "Mês" },
  { key: "semana", label: "Semana" },
  { key: "todos", label: "Todos" },
  { key: "custom", label: "Personalizado…" }
];

export function CorujaoPainel() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoChip>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  async function reload(p: PeriodoChip, from?: string, to?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ periodo: p });
      if (p === "custom") {
        if (!from || !to) {
          setLoading(false);
          return;
        }
        params.set("from", from);
        params.set("to", to);
      }
      const res = await clientApi<Painel>(`/corujao/painel?${params.toString()}`);
      setPainel(res);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar painel."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (periodo !== "custom") {
      reload(periodo);
    }
  }, [periodo]);

  function aplicarCustom() {
    if (!customFrom || !customTo) {
      toast.error("Informe as duas datas pra usar período personalizado.");
      return;
    }
    if (customFrom > customTo) {
      toast.error("Data inicial não pode ser maior que a final.");
      return;
    }
    reload("custom", customFrom, customTo);
  }

  if (loading && !painel) return <CardsSkeleton />;

  const totalReceita = painel?.totais.receitaCents ?? 0;

  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      {/* Header com período + chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium capitalize">
          {painel?.periodo.label ?? "—"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODO_CHIPS.map((c) => (
            <Button
              key={c.key}
              variant={periodo === c.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(c.key)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {periodo === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="space-y-1.5">
            <label htmlFor="custom-from" className="text-xs text-muted-foreground">
              De
            </label>
            <Input
              id="custom-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="custom-to" className="text-xs text-muted-foreground">
              Até
            </label>
            <Input
              id="custom-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9"
            />
          </div>
          <Button onClick={aplicarCustom} disabled={loading}>
            Aplicar
          </Button>
        </div>
      )}

      {/* Bloco 1: KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita"
          value={formatBRL(painel?.totais.receitaCents ?? 0)}
          hint={`Ticket médio ${formatBRL(painel?.totais.ticketMedioCents ?? 0)}`}
        />
        <KpiCard
          label="Vendas"
          value={String(painel?.totais.vendasCount ?? 0)}
          hint={`${painel?.totais.vendasCount === 1 ? "venda" : "vendas"} registradas`}
        />
        <KpiCard
          label="Ocupação"
          value={`${painel?.totais.vagasOcupadas ?? 0}/${painel?.totais.vagasOfertadas ?? 0}`}
          hint={`${formatPct(painel?.totais.taxaOcupacao ?? 0)} das vagas`}
        />
        <KpiCard
          label="Sessões"
          value={String(painel?.totais.sessoesRealizadas ?? 0)}
          hint={`${(painel?.totais.sessoesRealizadas ?? 0) === 1 ? "noite" : "noites"} no período`}
        />
      </div>

      {/* Bloco 2: por colaborador */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="border-b border-border/60 bg-card/40 px-4 py-3">
          <SectionHeader title="Vendas por colaborador" />
        </div>
        {painel && painel.porColaborador.length === 0 ? (
          <EmptyState
            icon={MoonIcon}
            title="Nenhuma venda no período"
            description="Quando registrar visitas, elas aparecem aqui."
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">% do total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {painel?.porColaborador.map((c) => {
                const pct =
                  totalReceita > 0
                    ? Math.round((c.receitaCents / totalReceita) * 100)
                    : 0;
                return (
                  <TableRow key={c.id ?? "sem-atrib"}>
                    <TableCell
                      className={c.id === null ? "italic text-muted-foreground" : "font-medium"}
                    >
                      {c.nome}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.vendas}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.receitaCents > 0 ? formatBRL(c.receitaCents) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.receitaCents > 0 ? `${pct}%` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bloco 3: sessões */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="border-b border-border/60 bg-card/40 px-4 py-3">
          <SectionHeader title="Sessões no período" />
        </div>
        {painel && painel.sessoesNoPeriodo.length === 0 ? (
          <EmptyState
            icon={MoonIcon}
            title="Nenhuma sessão no período"
            description="Sessões aparecem aqui quando entrarem no intervalo de datas."
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ocupação</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {painel?.sessoesNoPeriodo.map((s) => {
                const lotada = s.vagasOcupadas >= s.totalVagas && s.status !== "cancelado";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium capitalize">
                      {formatDataCurta(s.data)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={statusToTone(s.status)} className="capitalize">
                        {s.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={lotada ? "text-emerald-400" : ""}>
                        {s.vagasOcupadas}/{s.totalVagas}
                      </span>
                      {lotada && (
                        <CheckIcon className="ml-1 inline h-4 w-4 text-emerald-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.receitaCents > 0 ? formatBRL(s.receitaCents) : "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[260px] truncate text-sm text-muted-foreground"
                      title={s.observacoes ?? ""}
                    >
                      {s.observacoes ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
