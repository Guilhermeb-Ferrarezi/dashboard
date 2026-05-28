"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { clientApi, getClientApiBaseUrl } from "@/lib/api";
import { formatCurrency, formatDateShort, formatDateTimeShort } from "@/lib/format";
import type {
  CheckoutClienteAssinatura,
  CheckoutClientePedido,
  CheckoutClienteSummary
} from "@/types/portal";

const PEDIDOS_PAGE_SIZE = 15;

type PedidosPagination = { page: number; limit: number; total: number; pages: number };

const formatDate = formatDateTimeShort;
const formatBRL = formatCurrency;

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
    case "refunded":
      return { label: "Reembolsado", className: "bg-muted/40 text-muted-foreground border-border/60" };
    default:
      return { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  }
}

function truncateId(id: string | number, maxLen = 24) {
  const s = String(id);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function getSubscriptionStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Ativa", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "cancelled":
      return { label: "Cancelada", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    case "expired":
      return { label: "Expirada", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "paused":
      return { label: "Pausada", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    default:
      return { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  }
}

function getBehaviorLabel(cliente: CheckoutClienteSummary): { text: string; tone: string } {
  if (cliente.isVip) return { text: "VIP", tone: "bg-amber-500/15 text-amber-400" };
  if (cliente.orderCount > 1) return { text: "Recompra", tone: "bg-emerald-500/15 text-emerald-400" };
  return { text: "Novo", tone: "bg-muted/40 text-muted-foreground" };
}

interface CheckoutClienteDetalheProps {
  cliente: CheckoutClienteSummary;
}

export function CheckoutClienteDetalhe({ cliente }: CheckoutClienteDetalheProps) {
  const [pedidos, setPedidos] = useState<CheckoutClientePedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidosPage, setPedidosPage] = useState(1);
  const [pedidosPagination, setPedidosPagination] = useState<PedidosPagination>({
    page: 1,
    limit: PEDIDOS_PAGE_SIZE,
    total: 0,
    pages: 1
  });
  const [paidCount, setPaidCount] = useState(0);
  const [refundedCount, setRefundedCount] = useState(0);
  const [filterProduct, setFilterProduct] = useState("all");

  const [assinaturas, setAssinaturas] = useState<CheckoutClienteAssinatura[] | null>(null);
  const [loadingAssinaturas, setLoadingAssinaturas] = useState(false);
  const [detailPedido, setDetailPedido] = useState<CheckoutClientePedido | null>(null);
  const [refundPedido, setRefundPedido] = useState<CheckoutClientePedido | null>(null);
  const [refunding, setRefunding] = useState(false);

  const behavior = getBehaviorLabel(cliente);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pedidosPage), limit: String(PEDIDOS_PAGE_SIZE) });
    if (filterProduct !== "all") params.set("description", filterProduct);

    clientApi<{
      pedidos: CheckoutClientePedido[];
      paidCount: number;
      refundedCount: number;
      pagination: PedidosPagination;
    }>(`/checkout/clientes/${cliente.userId}/pedidos?${params.toString()}`)
      .then((res) => {
        setPedidos(res.pedidos);
        setPedidosPagination(res.pagination);
        setPaidCount(res.paidCount);
        setRefundedCount(res.refundedCount);
      })
      .catch(() => toast.error("Erro ao carregar pedidos."))
      .finally(() => setLoading(false));
  }, [cliente.userId, pedidosPage, filterProduct]);

  const loadAssinaturas = useCallback(async () => {
    if (assinaturas !== null || loadingAssinaturas) return;
    setLoadingAssinaturas(true);
    try {
      const res = await clientApi<{ assinaturas: CheckoutClienteAssinatura[] }>(
        `/checkout/clientes/${cliente.userId}/assinaturas`
      );
      setAssinaturas(res.assinaturas);
    } catch {
      toast.error("Erro ao carregar assinaturas.");
    } finally {
      setLoadingAssinaturas(false);
    }
  }, [cliente.userId, assinaturas, loadingAssinaturas]);

  useEffect(() => {
    void loadAssinaturas();
  }, [loadAssinaturas]);

  const productOptions = [...new Set(cliente.purchasedProducts)].sort();

  async function handleRefund() {
    if (!refundPedido) return;
    setRefunding(true);
    try {
      await clientApi<{ message: string }>(`/checkout/pedidos/${refundPedido.id}/refund`, { method: "POST" });
      toast.success("Reembolso solicitado com sucesso.");
      setPedidos((prev) =>
        prev.map((p) => p.id === refundPedido.id ? { ...p, status: "refunded" as const } : p)
      );
      setRefundedCount((c) => c + 1);
      setRefundPedido(null);
    } catch {
      toast.error("Erro ao solicitar reembolso. Endpoint ainda não implementado.");
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Dialog: Ver detalhes */}
      <Dialog open={!!detailPedido} onOpenChange={(open) => { if (!open) setDetailPedido(null); }}>
        <DialogContent className="sm:!max-w-lg !gap-0 !p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Detalhes da cobrança</DialogTitle>
          </DialogHeader>
          {detailPedido && (
            <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-[70vh]">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-base font-semibold">Cobrança — {formatBRL(detailPedido.amountCents)}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {detailPedido.chargeId ?? detailPedido.id}</p>
                </div>
                <Badge variant="outline" className={getStatusConfig(detailPedido.status).className}>
                  {getStatusConfig(detailPedido.status).label}
                </Badge>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-3">Informações da cobrança</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Valor</p>
                    <p>{formatBRL(detailPedido.amountCents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Método</p>
                    <p>Pix</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <p>Cobrança única</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Criação</p>
                    <p>{formatDate(detailPedido.createdAt)}</p>
                  </div>
                  {detailPedido.paidAt && (
                    <div>
                      <p className="text-muted-foreground text-xs">Pago em</p>
                      <p>{formatDate(detailPedido.paidAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Última atualização</p>
                    <p>{formatDate(detailPedido.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Product ID</p>
                    <p className="font-mono text-xs">{detailPedido.productId}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm font-semibold mb-3">Cliente</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Nome</p>
                    <p>{cliente.userLogin}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">E-mail</p>
                    <p>{cliente.userEmail ?? "—"}</p>
                  </div>
                </div>
              </div>

              {detailPedido.checkoutUrl && (
                <div className="px-5 py-4">
                  <p className="text-sm font-semibold mb-3">Links</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">URL do checkout</p>
                    <p className="text-xs font-mono break-all">{detailPedido.checkoutUrl}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Reembolsar */}
      <Dialog open={!!refundPedido} onOpenChange={(open) => { if (!open) setRefundPedido(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reembolso</DialogTitle>
          </DialogHeader>
          {refundPedido && (
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja reembolsar o pedido{" "}
              <span className="font-medium text-foreground">#{refundPedido.id}</span>{" "}
              no valor de{" "}
              <span className="font-medium text-foreground">{formatBRL(refundPedido.amountCents)}</span>?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPedido(null)} disabled={refunding}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleRefund()} disabled={refunding}>
              {refunding ? "Reembolsando…" : "Confirmar reembolso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{cliente.userName ?? cliente.userLogin}</h2>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">ID:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cliente.providerCustomerId}</code>
          <CopyButton value={cliente.providerCustomerId} label="Copiar ID" />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {cliente.userEmail && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">E-mail:</span>
              <span>{cliente.userEmail}</span>
              <CopyButton value={cliente.userEmail} label="Copiar e-mail" />
            </span>
          )}
          {cliente.userTaxId && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">CPF/CNPJ:</span>
              <span>{cliente.userTaxId}</span>
              <CopyButton value={cliente.userTaxId} label="Copiar CPF/CNPJ" />
            </span>
          )}
          {cliente.userPhone && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Telefone:</span>
              <span>{cliente.userPhone}</span>
              <CopyButton value={cliente.userPhone} label="Copiar telefone" />
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Criado em:</span>
            <span>{formatDate(cliente.createdAt)}</span>
          </span>
        </div>
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
            <p className="text-xs text-muted-foreground mb-1">Pagamentos</p>
            <p className="text-xl font-bold tabular-nums">{paidCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Reembolsos</p>
            <p className="text-xl font-bold tabular-nums">{refundedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Disputas</p>
            <p className="text-xl font-bold tabular-nums">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Assinaturas ativas</p>
            <p className="text-xl font-bold tabular-nums">{assinaturas?.filter((a) => a.status === "active").length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total de assinaturas</p>
            <p className="text-xl font-bold tabular-nums">{assinaturas?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Produto mais comprado</p>
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
          <TabsTrigger value="assinaturas" className="flex-1" onClick={() => void loadAssinaturas()}>
            Assinaturas
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

              {!loading && pedidos.length === 0 && (
                <EmptyState
                  icon={ShoppingCartIcon}
                  title="Nenhum pedido"
                  description={filterProduct !== "all" ? "Tente outro produto." : "Este cliente ainda não tem pedidos."}
                  className="m-4"
                />
              )}

              {!loading && pedidos.length > 0 && (
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
                    {pedidos.map((pedido) => {
                      const statusCfg = getStatusConfig(pedido.status);
                      const isPaid = pedido.status === "paid";
                      return (
                        <TableRow
                          key={pedido.id}
                          className="cursor-pointer"
                          onClick={() => setDetailPedido(pedido)}
                        >
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailPedido(pedido)}>
                                  Ver detalhes
                                </DropdownMenuItem>
                                {isPaid && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      window.open(`${getClientApiBaseUrl()}/checkout/pedidos/${pedido.id}/comprovante`, "_blank");
                                    }}>
                                      Comprovante
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setRefundPedido(pedido)}>
                                      Reembolsar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      toast("Emitir nota fiscal — em breve");
                                    }}>
                                      Emitir nota fiscal
                                    </DropdownMenuItem>
                                  </>
                                )}
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

            {pedidosPagination.pages > 1 && (
              <Pagination page={pedidosPage} pageCount={pedidosPagination.pages} onPageChange={setPedidosPage} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="assinaturas">
          <div className="flex flex-col gap-4 mt-4">
            <div className="rounded-lg border border-border/60 overflow-hidden">
              {loadingAssinaturas && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Carregando assinaturas…
                </div>
              )}

              {!loadingAssinaturas && assinaturas !== null && assinaturas.length === 0 && (
                <EmptyState
                  icon={ShoppingCartIcon}
                  title="Nenhuma assinatura"
                  description="Este cliente ainda não tem assinaturas."
                  className="m-4"
                />
              )}

              {!loadingAssinaturas && assinaturas && assinaturas.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assinaturas.map((assinatura) => {
                      const statusCfg = getSubscriptionStatusConfig(assinatura.status);
                      return (
                        <TableRow key={assinatura.id}>
                          <TableCell className="text-sm font-medium">{assinatura.productName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(assinatura.startedAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {assinatura.expiresAt ? formatDateShort(assinatura.expiresAt) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(assinatura.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
