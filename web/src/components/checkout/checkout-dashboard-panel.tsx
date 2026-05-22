"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboardIcon, PackageIcon, ShoppingCartIcon, UsersIcon, ZapIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CheckoutDashboardData, CheckoutOrderStatus } from "@/types/portal";

function formatCurrency(cents: number) {
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

interface CheckoutDashboardPanelProps {
  data: CheckoutDashboardData;
}

export function CheckoutDashboardPanel({ data }: CheckoutDashboardPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Checkout"
        title="Dashboard"
        description="Visão geral de pagamentos e vendas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShoppingCartIcon}
          label="Total de pedidos"
          value={data.totalOrders}
          hint="todos os status"
        />
        <StatCard
          icon={ZapIcon}
          iconTone="bg-green-500/10 text-green-500"
          label="Pedidos pagos"
          value={data.paidOrders}
          hint={`${data.totalOrders > 0 ? Math.round((data.paidOrders / data.totalOrders) * 100) : 0}% do total`}
        />
        <StatCard
          icon={LayoutDashboardIcon}
          iconTone="bg-blue-500/10 text-blue-500"
          label="Receita total"
          value={formatCurrency(data.totalRevenueCents)}
          hint="pedidos confirmados"
        />
        <StatCard
          icon={UsersIcon}
          iconTone="bg-purple-500/10 text-purple-500"
          label="Clientes"
          value={data.totalClientes}
          hint="cadastrados no checkout"
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PackageIcon className="size-3.5" />
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
                  <TableHead>#</TableHead>
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
                    <TableCell className="text-sm">{order.userId}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {order.description}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatCurrency(order.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status]}>
                        {STATUS_LABEL[order.status]}
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
