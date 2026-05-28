"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarIcon,
  LayoutDashboardIcon,
  PackageIcon,
  RefreshCcwIcon,
  ShoppingCartIcon,
  SparklesIcon,
  UsersIcon,
  ZapIcon
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CheckoutDashboardData, CheckoutOrderStatus } from "@/types/portal";
import { formatCurrency, formatDateTime } from "@/lib/format";

const formatBRL = formatCurrency;
const formatDate = formatDateTime;

const STATUS_LABEL: Record<CheckoutOrderStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado",
  cancelled: "Cancelado"
};

const STATUS_CLASS: Record<CheckoutOrderStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  expired: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30"
};

function BarChart({ data }: { data: { dia: string; total: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">Sem dados nos últimos 30 dias.</p>;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <TooltipProvider>
      <div className="flex items-end gap-[3px] h-16">
        {data.map((d) => {
          const h = Math.max((d.total / max) * 100, 4);
          const date = new Date(d.dia + "T12:00:00");
          const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          return (
            <Tooltip key={d.dia}>
              <TooltipTrigger
                className="flex-1 min-w-0 rounded-sm bg-primary/30 hover:bg-primary/60 transition-colors cursor-default border-0 p-0"
                style={{ height: `${h}%` }}
              />
              <TooltipContent>{label}: {d.total} pedido{d.total !== 1 ? "s" : ""}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function StatusBars({ data }: { data: { status: string; total: number }[] }) {
  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  const order: CheckoutOrderStatus[] = ["paid", "pending", "cancelled", "expired", "failed"];
  const colors: Record<string, string> = {
    paid: "bg-emerald-500",
    pending: "bg-amber-400",
    cancelled: "bg-zinc-500",
    expired: "bg-orange-400",
    failed: "bg-red-500"
  };
  return (
    <div className="flex flex-col gap-2">
      <TooltipProvider>
        <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
          {order.map((s) => {
            const item = data.find((d) => d.status === s);
            const pct = item ? (item.total / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <Tooltip key={s}>
                <TooltipTrigger
                  className={`${colors[s]} rounded-sm cursor-default border-0 p-0`}
                  style={{ width: `${pct}%` }}
                />
                <TooltipContent>{STATUS_LABEL[s]}: {item?.total}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {order.map((s) => {
          const item = data.find((d) => d.status === s);
          if (!item) return null;
          return (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-2 rounded-full ${colors[s]}`} />
              {STATUS_LABEL[s]}: <span className="font-medium text-foreground">{item.total}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface CheckoutDashboardPanelProps {
  data: CheckoutDashboardData;
}

export function CheckoutDashboardPanel({ data }: CheckoutDashboardPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  const conversionRate = data.totalOrders > 0
    ? Math.round((data.paidOrders / data.totalOrders) * 100)
    : 0;

  const receitaPorProduto = data.receitaPorProduto ?? [];
  const pedidosPorDia = data.pedidosPorDia ?? [];
  const statusBreakdown = data.statusBreakdown ?? [];
  const ticketMedioCents = data.ticketMedioCents ?? 0;
  const receitaHojeCents = data.receitaHojeCents ?? 0;
  const receitaSemanaCents = data.receitaSemanaCents ?? 0;
  const pedidosHoje = data.pedidosHoje ?? 0;

  const maxReceita = Math.max(...receitaPorProduto.map((p) => p.receita), 1);

  return (
    <div className={`flex flex-col gap-6 transition-opacity${isPending ? " pointer-events-none opacity-60" : ""}`}>
      <PageHeader
        eyebrow="Checkout"
        title="Dashboard"
        description="Visão geral de pagamentos e vendas."
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handleRefresh}
                  disabled={isPending}
                  aria-label="Atualizar dashboard"
                  className="group/refresh relative size-8 rounded-md"
                >
                  {isPending
                    ? <Spinner size="sm" />
                    : <RefreshCcwIcon className="size-3.5 transition-transform duration-300 group-hover/refresh:rotate-90" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar dashboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Linha 1 — totais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShoppingCartIcon}
          label="Total de pedidos"
          value={data.totalOrders.toLocaleString("pt-BR")}
          hint="todos os status"
        />
        <StatCard
          icon={ZapIcon}
          iconTone="bg-emerald-500/10 text-emerald-400"
          label="Pedidos pagos"
          value={data.paidOrders.toLocaleString("pt-BR")}
          hint={`${conversionRate}% de conversão`}
        />
        <StatCard
          icon={LayoutDashboardIcon}
          iconTone="bg-muted/40 text-muted-foreground"
          label="Receita total"
          value={formatBRL(data.totalRevenueCents)}
          hint="pedidos confirmados"
        />
        <StatCard
          icon={SparklesIcon}
          iconTone="bg-amber-500/10 text-amber-400"
          label="Ticket médio"
          value={formatBRL(ticketMedioCents)}
          hint="por pedido pago"
        />
      </div>

      {/* Linha 2 — hoje / semana */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarIcon}
          label="Receita hoje"
          value={formatBRL(receitaHojeCents)}
        />
        <StatCard
          icon={CalendarIcon}
          iconTone="bg-muted/40 text-muted-foreground"
          label="Receita esta semana"
          value={formatBRL(receitaSemanaCents)}
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Pedidos hoje"
          value={pedidosHoje.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={UsersIcon}
          iconTone="bg-muted/40 text-muted-foreground"
          label="Clientes"
          value={data.totalClientes.toLocaleString("pt-BR")}
          hint="cadastrados no checkout"
        />
      </div>

      {/* Gráfico + Status */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="border-b border-border/40 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarIcon className="size-3.5" />
              </span>
              Pedidos por dia (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-3">
            <BarChart data={pedidosPorDia} />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="border-b border-border/40 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ZapIcon className="size-3.5" />
              </span>
              Status dos pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-3">
            {statusBreakdown.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">Sem dados.</p>
              : <StatusBars data={statusBreakdown} />}
          </CardContent>
        </Card>
      </div>

      {/* Receita por produto */}
      {receitaPorProduto.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="border-b border-border/40 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PackageIcon className="size-3.5" />
              </span>
              Receita por produto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-3 flex flex-col gap-3">
            {receitaPorProduto.map((p) => (
              <div key={p.produto} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[60%]">{p.produto}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBRL(p.receita)} · {p.qtd} venda{p.qtd !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${(p.receita / maxReceita) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pedidos recentes */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShoppingCartIcon className="size-3.5" />
            </span>
            Pedidos recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{order.userLogin}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {order.description}
                    </TableCell>
                    <TableCell className={`text-sm tabular-nums font-medium ${order.status === "paid" ? "text-emerald-400" : ""}`}>
                      {formatBRL(order.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[order.status as CheckoutOrderStatus] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}>
                        {STATUS_LABEL[order.status as CheckoutOrderStatus] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
