"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  SparklesIcon,
  UsersIcon,
  ZapIcon
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CheckoutDashboardData, CheckoutOrderStatus } from "@/types/portal";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const STATUS_LABEL: Record<CheckoutOrderStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado"
};

const STATUS_VARIANT: Record<CheckoutOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  expired: "outline"
};

function BarChart({ data }: { data: { dia: string; total: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">Sem dados nos últimos 30 dias.</p>;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-[3px] h-16">
      {data.map((d) => {
        const h = Math.max((d.total / max) * 100, 4);
        const date = new Date(d.dia + "T12:00:00");
        const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return (
          <div
            key={d.dia}
            className="flex-1 min-w-0 rounded-sm bg-primary/30 hover:bg-primary/60 transition-colors cursor-default"
            style={{ height: `${h}%` }}
            title={`${label}: ${d.total} pedido${d.total !== 1 ? "s" : ""}`}
          />
        );
      })}
    </div>
  );
}

function StatusBars({ data }: { data: { status: string; total: number }[] }) {
  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  const order: CheckoutOrderStatus[] = ["paid", "pending", "expired", "failed"];
  const colors: Record<string, string> = {
    paid: "bg-emerald-500",
    pending: "bg-amber-400",
    expired: "bg-zinc-500",
    failed: "bg-red-500"
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
        {order.map((s) => {
          const item = data.find((d) => d.status === s);
          const pct = item ? (item.total / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              className={`${colors[s]} rounded-sm`}
              style={{ width: `${pct}%` }}
              title={`${STATUS_LABEL[s]}: ${item?.total}`}
            />
          );
        })}
      </div>
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
  const conversionRate = data.totalOrders > 0
    ? Math.round((data.paidOrders / data.totalOrders) * 100)
    : 0;

  const maxReceita = Math.max(...data.receitaPorProduto.map((p) => p.receita), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Checkout"
        title="Dashboard"
        description="Visão geral de pagamentos e vendas."
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
          iconTone="bg-blue-500/10 text-blue-400"
          label="Receita total"
          value={formatBRL(data.totalRevenueCents)}
          hint="pedidos confirmados"
        />
        <StatCard
          icon={SparklesIcon}
          iconTone="bg-amber-500/10 text-amber-400"
          label="Ticket médio"
          value={formatBRL(data.ticketMedioCents)}
          hint="por pedido pago"
        />
      </div>

      {/* Linha 2 — hoje / semana */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarIcon}
          label="Receita hoje"
          value={formatBRL(data.receitaHojeCents)}
        />
        <StatCard
          icon={CalendarIcon}
          iconTone="bg-violet-500/10 text-violet-400"
          label="Receita esta semana"
          value={formatBRL(data.receitaSemanaCents)}
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Pedidos hoje"
          value={data.pedidosHoje.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={UsersIcon}
          iconTone="bg-purple-500/10 text-purple-400"
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
            <BarChart data={data.pedidosPorDia} />
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
            {data.statusBreakdown.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">Sem dados.</p>
              : <StatusBars data={data.statusBreakdown} />}
          </CardContent>
        </Card>
      </div>

      {/* Receita por produto */}
      {data.receitaPorProduto.length > 0 && (
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
            {data.receitaPorProduto.map((p) => (
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
                      <Badge variant={STATUS_VARIANT[order.status as CheckoutOrderStatus]}>
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
