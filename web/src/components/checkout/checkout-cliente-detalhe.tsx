"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  MoreHorizontalIcon,
  ShoppingCartIcon
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientApi } from "@/lib/api";
import type {
  CheckoutClientePedido,
  CheckoutClienteSummary
} from "@/types/portal";

const PEDIDOS_PAGE_SIZE = 15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "paid":
      return { label: "Pago", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "pending":
      return { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    case "expired":
      return { label: "Expirado", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "cancelled":
      return { label: "Cancelado", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    case "failed":
      return { label: "Falhou", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    default:
      return { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  }
}

function truncateId(id: string | number, maxLen = 24) {
  const s = String(id);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function getBehaviorLabel(cliente: CheckoutClienteSummary): { text: string; tone: string } {
  if (cliente.isVip) return { text: "VIP", tone: "bg-amber-500/15 text-amber-400" };
  if (cliente.orderCount > 1) return { text: "Recompra", tone: "bg-emerald-500/15 text-emerald-400" };
  return { text: "Novo", tone: "bg-blue-500/15 text-blue-400" };
}

interface CheckoutClienteDetalheProps {
  cliente: CheckoutClienteSummary;
}

export function CheckoutClienteDetalhe({ cliente }: CheckoutClienteDetalheProps) {
  const [pedidos, setPedidos] = useState<CheckoutClientePedido[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pedidosPage, setPedidosPage] = useState(1);
  const [filterProduct, setFilterProduct] = useState("all");

  const behavior = getBehaviorLabel(cliente);

  const loadPedidos = useCallback(async () => {
    if (pedidos !== null || loading) return;
    setLoading(true);
    try {
      const res = await clientApi<{ pedidos: CheckoutClientePedido[] }>(
        `/checkout/clientes/${cliente.userId}/pedidos`
      );
      setPedidos(res.pedidos);
    } catch {
      toast.error("Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [cliente.userId, pedidos, loading]);

  useEffect(() => {
    void loadPedidos();
  }, [loadPedidos]);

  const filteredPedidos = useMemo(() => {
    if (!pedidos) return [];
    if (filterProduct === "all") return pedidos;
    return pedidos.filter((p) => p.description === filterProduct);
  }, [pedidos, filterProduct]);

  const pedidosPageCount = Math.max(1, Math.ceil(filteredPedidos.length / PEDIDOS_PAGE_SIZE));
  const safePedidosPage = Math.min(pedidosPage, pedidosPageCount);
  const paginatedPedidos = filteredPedidos.slice(
    (safePedidosPage - 1) * PEDIDOS_PAGE_SIZE,
    safePedidosPage * PEDIDOS_PAGE_SIZE
  );

  const productOptions = useMemo(() => {
    return [...new Set(cliente.purchasedProducts)].sort();
  }, [cliente.purchasedProducts]);

  function handleMenuAction(action: string, pedido: CheckoutClientePedido) {
    switch (action) {
      case "details":
        toast.info(
          `Pedido #${pedido.id} — ${pedido.description}\n${formatBRL(pedido.amountCents)} — ${getStatusConfig(pedido.status).label}\n${formatDate(pedido.createdAt)}`
        );
        break;
      case "receipt":
        toast("Comprovante — em breve");
        break;
      case "refund":
        toast("Reembolsar — em breve");
        break;
      case "invoice":
        toast("Emitir nota fiscal — em breve");
        break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Checkout › Clientes"
        title={cliente.userLogin}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">ID:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cliente.abacateCustomerId}</code>
          <CopyButton value={cliente.abacateCustomerId} label="Copiar ID" />
        </span>
        {cliente.userEmail && (
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">E-mail:</span>
            <span className="font-medium">{cliente.userEmail}</span>
            <CopyButton value={cliente.userEmail} label="Copiar e-mail" />
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Criado em:</span>
          <span>{formatDate(cliente.createdAt)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total faturado</p>
            <p className="text-xl font-bold tabular-nums">{formatBRL(cliente.totalSpentCents)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
            <p className="text-xl font-bold tabular-nums">{cliente.orderCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Último produto</p>
            <p className="text-sm font-medium mt-1">{cliente.lastPaidProduct ?? "Nenhum"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Comportamento</p>
            <Badge variant="outline" className={`mt-1 ${behavior.tone}`}>{behavior.text}</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList className="w-full">
          <TabsTrigger value="pedidos" className="flex-1">
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex-1">
            Produtos comprados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <div className="flex flex-col gap-4 mt-4">
            {productOptions.length > 1 && (
              <select
                value={filterProduct}
                onChange={(e) => {
                  setFilterProduct(e.target.value);
                  setPedidosPage(1);
                }}
                className="h-8 w-fit rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="all">Todos os produtos</option>
                {productOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <div className="rounded-lg border border-border/60 overflow-hidden">
              {loading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Carregando pedidos…
                </div>
              )}

              {!loading && pedidos !== null && filteredPedidos.length === 0 && (
                <EmptyState
                  icon={ShoppingCartIcon}
                  title="Nenhum pedido"
                  description={filterProduct !== "all" ? "Tente outro produto." : "Este cliente ainda não tem pedidos."}
                  className="m-4"
                />
              )}

              {!loading && filteredPedidos.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ID do pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPedidos.map((pedido) => {
                      const statusCfg = getStatusConfig(pedido.status);
                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="text-sm">{pedido.description}</TableCell>
                          <TableCell className="text-sm tabular-nums">{formatBRL(pedido.amountCents)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {truncateId(pedido.id)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(pedido.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMenuAction("details", pedido)}>
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("receipt", pedido)}>
                                  Comprovante
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("refund", pedido)}>
                                  Reembolsar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("invoice", pedido)}>
                                  Emitir nota fiscal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {pedidosPageCount > 1 && (
              <Pagination page={safePedidosPage} pageCount={pedidosPageCount} onPageChange={setPedidosPage} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="produtos">
          <div className="mt-4">
            {cliente.purchasedProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingCartIcon}
                title="Nenhum produto"
                description="Este cliente ainda não comprou nenhum produto."
                className="m-4"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {cliente.purchasedProducts.map((p) => (
                  <Badge key={p} variant="secondary" className="text-sm px-3 py-1">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
