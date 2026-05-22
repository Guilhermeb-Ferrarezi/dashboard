"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  MailIcon,
  PackageIcon,
  PencilIcon,
  ShoppingCartIcon,
  SparklesIcon,
  Trash2Icon,
  UsersIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { clientApi } from "@/lib/api";
import type {
  CheckoutClientePedido,
  CheckoutClienteSummary,
  CheckoutNovosPorMes
} from "@/types/portal";

const PAGE_SIZE = 20;

type SortBy = "createdAt" | "totalSpent" | "orderCount";
type SortDir = "asc" | "desc";
type FilterPeriod = "all" | "7d" | "30d" | "90d" | "365d";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getAvatarColor(login: string): string {
  let hash = 0;
  for (let i = 0; i < login.length; i++) {
    hash = login.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-500/15 text-blue-400",
    "bg-violet-500/15 text-violet-400",
    "bg-emerald-500/15 text-emerald-400",
    "bg-orange-500/15 text-orange-400",
    "bg-pink-500/15 text-pink-400",
    "bg-cyan-500/15 text-cyan-400",
    "bg-amber-500/15 text-amber-400",
    "bg-rose-500/15 text-rose-400"
  ];
  return colors[Math.abs(hash) % colors.length]!;
}

function getOrderBadgeVariant(count: number): "default" | "secondary" | "outline" {
  if (count >= 5) return "default";
  if (count >= 2) return "secondary";
  return "outline";
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "pending") return "secondary";
  if (status === "failed" || status === "expired") return "destructive";
  return "outline";
}

function getStatusLabel(status: string): string {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "failed") return "Falhou";
  if (status === "expired") return "Expirado";
  return status;
}

function Sparkline({ data }: { data: CheckoutNovosPorMes[] }) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d) => {
        const heightPct = Math.max((d.total / maxVal) * 100, 4);
        const label = d.mes.slice(5); // "MM" from "YYYY-MM"
        return (
          <div key={d.mes} className="flex flex-col items-center gap-1 flex-1 min-w-0 group/bar">
            <div
              className="w-full rounded-sm bg-primary/30 group-hover/bar:bg-primary/60 transition-colors cursor-default"
              style={{ height: `${heightPct}%` }}
              title={`${d.mes}: ${d.total} cliente${d.total !== 1 ? "s" : ""}`}
            />
            <span className="text-[9px] text-muted-foreground tabular-nums hidden group-hover/bar:block absolute -bottom-4">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PedidosSubRow({
  userId,
  pedidosCache,
  onLoad
}: {
  userId: number;
  pedidosCache: Map<number, CheckoutClientePedido[]>;
  onLoad: (userId: number, pedidos: CheckoutClientePedido[]) => void;
}) {
  const cached = pedidosCache.get(userId);

  if (!cached) {
    // Trigger load
    void clientApi<{ pedidos: CheckoutClientePedido[] }>(
      `/checkout/clientes/${userId}/pedidos`
    ).then((res) => onLoad(userId, res.pedidos));
    return (
      <TableRow>
        <TableCell colSpan={8} className="py-3 text-center text-xs text-muted-foreground">
          Carregando pedidos...
        </TableCell>
      </TableRow>
    );
  }

  if (cached.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="py-3 text-center text-xs text-muted-foreground">
          Nenhum pedido encontrado.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {cached.map((p) => (
        <TableRow key={`pedido-${p.id}`} className="bg-muted/20 hover:bg-muted/30">
          <TableCell />
          <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
          <TableCell className="text-xs" colSpan={2}>
            {p.description}
          </TableCell>
          <TableCell className="text-xs tabular-nums">{formatBRL(p.amountCents)}</TableCell>
          <TableCell className="text-xs">
            <Badge variant={getStatusBadgeVariant(p.status)}>{getStatusLabel(p.status)}</Badge>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  );
}

interface CheckoutClientesPanelProps {
  initialClientes: CheckoutClienteSummary[];
  novosPorMes: CheckoutNovosPorMes[];
}

export function CheckoutClientesPanel({
  initialClientes,
  novosPorMes
}: CheckoutClientesPanelProps) {
  const [query, setQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [pedidosCache, setPedidosCache] = useState<Map<number, CheckoutClientePedido[]>>(
    new Map()
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [clientes, setClientes] = useState(initialClientes);
  const [editingCliente, setEditingCliente] = useState<CheckoutClienteSummary | null>(null);
  const [editLogin, setEditLogin] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingCliente, setDeletingCliente] = useState<CheckoutClienteSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allProducts = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientes) {
      for (const p of c.purchasedProducts) {
        if (p) set.add(p);
      }
    }
    return [...set].sort();
  }, [clientes]);

  // Stats
  const totalClientes = clientes.length;
  const totalRecebido = clientes.reduce((acc, c) => acc + c.totalSpentCents, 0);
  const vipCount = clientes.filter((c) => c.isVip).length;
  const topCliente = useMemo(() => {
    if (clientes.length === 0) return null;
    return clientes.reduce((best, c) =>
      c.totalSpentCents > best.totalSpentCents ? c : best
    );
  }, [clientes]);

  const periodCutoff = useMemo((): Date | null => {
    const now = new Date();
    if (filterPeriod === "7d") return new Date(now.getTime() - 7 * 86400_000);
    if (filterPeriod === "30d") return new Date(now.getTime() - 30 * 86400_000);
    if (filterPeriod === "90d") return new Date(now.getTime() - 90 * 86400_000);
    if (filterPeriod === "365d") return new Date(now.getTime() - 365 * 86400_000);
    return null;
  }, [filterPeriod]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = clientes.filter((c) => {
      if (
        q &&
        !c.userLogin.toLowerCase().includes(q) &&
        !(c.userEmail?.toLowerCase().includes(q) ?? false) &&
        !String(c.userId).includes(q)
      )
        return false;
      if (filterProduct !== "all" && !c.purchasedProducts.includes(filterProduct)) return false;
      if (periodCutoff && new Date(c.createdAt) < periodCutoff) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let valA: number;
      let valB: number;
      if (sortBy === "totalSpent") {
        valA = a.totalSpentCents;
        valB = b.totalSpentCents;
      } else if (sortBy === "orderCount") {
        valA = a.orderCount;
        valB = b.orderCount;
      } else {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [clientes, query, filterProduct, periodCutoff, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(by: SortBy) {
    if (sortBy === by) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(by);
      setSortDir("desc");
    }
    setPage(1);
  }

  function handleFilterChange() {
    setPage(1);
  }

  function handlePedidosLoad(userId: number, pedidos: CheckoutClientePedido[]) {
    setPedidosCache((prev) => {
      const next = new Map(prev);
      next.set(userId, pedidos);
      return next;
    });
  }

  function handleToggleExpand(userId: number) {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  }

  async function handleCopyEmail(cliente: CheckoutClienteSummary) {
    const text = cliente.userEmail ?? cliente.userLogin;
    await navigator.clipboard.writeText(text);
    setCopiedId(cliente.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleExportCSV() {
    const header = "userId,login,email,cadastrado,pedidos,totalGasto,vip";
    const rows = filtered.map((c) =>
      [
        c.userId,
        `"${c.userLogin}"`,
        `"${c.userEmail ?? ""}"`,
        `"${formatDateShort(c.createdAt)}"`,
        c.orderCount,
        (c.totalSpentCents / 100).toFixed(2),
        c.isVip ? "sim" : "nao"
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenEdit(cliente: CheckoutClienteSummary) {
    setEditingCliente(cliente);
    setEditLogin(cliente.userLogin);
    setEditEmail(cliente.userEmail ?? "");
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingCliente) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await clientApi(`/checkout/clientes/${editingCliente.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ userLogin: editLogin, userEmail: editEmail })
      });
      setClientes((prev) =>
        prev.map((c) =>
          c.userId === editingCliente.userId
            ? { ...c, userLogin: editLogin.trim() || c.userLogin, userEmail: editEmail.trim() || null }
            : c
        )
      );
      setEditingCliente(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCliente) return;
    setDeleting(true);
    try {
      await clientApi(`/checkout/clientes/${deletingCliente.userId}`, { method: "DELETE" });
      setClientes((prev) => prev.filter((c) => c.userId !== deletingCliente.userId));
      setDeletingCliente(null);
    } catch {
      // silently ignore; user can retry
    } finally {
      setDeleting(false);
    }
  }

  function SortIcon({ col }: { col: SortBy }) {
    if (sortBy !== col)
      return <span className="ml-1 opacity-30 text-[10px]">↕</span>;
    return sortDir === "asc" ? (
      <ChevronUpIcon className="ml-1 inline size-3" />
    ) : (
      <ChevronDownIcon className="ml-1 inline size-3" />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog open={!!editingCliente} onOpenChange={(open) => { if (!open) setEditingCliente(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Login</label>
              <Input
                value={editLogin}
                onChange={(e) => setEditLogin(e.target.value)}
                placeholder="login do usuário"
                disabled={editSaving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                disabled={editSaving}
              />
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCliente(null)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={editSaving}>
              {editSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCliente} onOpenChange={(open) => { if (!open) setDeletingCliente(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-1">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{deletingCliente?.userLogin}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCliente(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        eyebrow="Checkout"
        title="Clientes"
        description="Clientes cadastrados no checkout com histórico de pedidos."
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={UsersIcon}
          label="Total de clientes"
          value={totalClientes.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Total recebido"
          value={formatBRL(totalRecebido)}
          hint="somente pedidos pagos"
        />
        <StatCard
          icon={SparklesIcon}
          iconTone="bg-amber-500/10 text-amber-400"
          label="Clientes VIP"
          value={vipCount.toLocaleString("pt-BR")}
          hint="≥ R$50 ou ≥ 3 pedidos"
        />
        <StatCard
          icon={PackageIcon}
          label="Maior comprador"
          value={topCliente ? topCliente.userLogin : "—"}
          hint={topCliente ? formatBRL(topCliente.totalSpentCents) : undefined}
        />
      </div>

      {/* Sparkline */}
      {novosPorMes.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="border-b border-border/40 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarIcon className="size-3.5" />
              </span>
              Novos clientes por mês (últimos 12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-end gap-1.5 h-14">
              {novosPorMes.map((d) => {
                const maxVal = Math.max(...novosPorMes.map((x) => x.total), 1);
                const heightPct = Math.max((d.total / maxVal) * 100, 4);
                const [year, month] = d.mes.split("-");
                const label = new Date(
                  Number(year),
                  Number(month) - 1,
                  1
                ).toLocaleDateString("pt-BR", { month: "short" });
                return (
                  <div
                    key={d.mes}
                    className="flex flex-col items-center gap-1 flex-1 min-w-0 group/bar"
                    title={`${d.mes}: ${d.total} cliente${d.total !== 1 ? "s" : ""}`}
                  >
                    <div
                      className="w-full rounded-sm bg-primary/30 group-hover/bar:bg-primary/70 transition-colors"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground tabular-nums">{label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 py-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="flex items-center gap-2 shrink-0">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UsersIcon className="size-3.5" />
              </span>
              <span className="text-muted-foreground">
                {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado
                {filtered.length !== 1 ? "s" : ""}
              </span>
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-2 justify-end">
              <Input
                placeholder="Buscar por login ou email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  handleFilterChange();
                }}
                className="h-8 w-52 text-sm"
              />
              <select
                value={filterProduct}
                onChange={(e) => {
                  setFilterProduct(e.target.value);
                  handleFilterChange();
                }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="all">Todos os produtos</option>
                {allProducts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value as FilterPeriod);
                  handleFilterChange();
                }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="all">Qualquer período</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="365d">Último ano</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                Exportar CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="Nenhum cliente encontrado"
              description={
                query || filterProduct !== "all" || filterPeriod !== "all"
                  ? "Tente outros filtros."
                  : "Nenhum cliente cadastrado ainda."
              }
              className="m-4"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Cliente</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("totalSpent")}
                  >
                    Total gasto
                    <SortIcon col="totalSpent" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("orderCount")}
                  >
                    Pedidos
                    <SortIcon col="orderCount" />
                  </TableHead>
                  <TableHead>Último produto pago</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    Cadastrado
                    <SortIcon col="createdAt" />
                  </TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((cliente) => (
                  <>
                    <TableRow
                      key={cliente.id}
                      className={expandedUserId === cliente.userId ? "bg-muted/10" : ""}
                    >
                      {/* Avatar */}
                      <TableCell>
                        <div
                          className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(cliente.userLogin)}`}
                        >
                          {cliente.userLogin.charAt(0).toUpperCase()}
                        </div>
                      </TableCell>
                      {/* Login + email + VIP */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{cliente.userLogin}</span>
                            {cliente.isVip && (
                              <Badge variant="default" className="h-4 text-[10px]">
                                VIP
                              </Badge>
                            )}
                          </div>
                          {cliente.userEmail && (
                            <span className="text-[11px] text-muted-foreground">
                              {cliente.userEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {/* Total gasto */}
                      <TableCell>
                        <span
                          className={
                            cliente.totalSpentCents > 0
                              ? "text-sm font-medium text-emerald-400 tabular-nums"
                              : "text-sm text-muted-foreground tabular-nums"
                          }
                        >
                          {formatBRL(cliente.totalSpentCents)}
                        </span>
                      </TableCell>
                      {/* Pedidos */}
                      <TableCell>
                        <Badge variant={getOrderBadgeVariant(cliente.orderCount)}>
                          {cliente.orderCount}
                        </Badge>
                      </TableCell>
                      {/* Último produto pago */}
                      <TableCell>
                        {cliente.lastPaidProduct ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs">{cliente.lastPaidProduct}</span>
                            {cliente.lastOrderAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateShort(cliente.lastOrderAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* Cadastrado */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(cliente.createdAt)}
                      </TableCell>
                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title={
                              copiedId === cliente.id
                                ? "Copiado!"
                                : cliente.userEmail
                                  ? "Copiar email"
                                  : "Copiar login"
                            }
                            onClick={() => void handleCopyEmail(cliente)}
                          >
                            <MailIcon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Editar cliente"
                            onClick={() => handleOpenEdit(cliente)}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Excluir cliente"
                            onClick={() => setDeletingCliente(cliente)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title={
                              expandedUserId === cliente.userId
                                ? "Ocultar pedidos"
                                : "Ver pedidos"
                            }
                            onClick={() => handleToggleExpand(cliente.userId)}
                          >
                            {expandedUserId === cliente.userId ? (
                              <ChevronUpIcon className="size-3.5" />
                            ) : (
                              <ChevronRightIcon className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedUserId === cliente.userId && (
                      <PedidosSubRow
                        key={`pedidos-${cliente.userId}`}
                        userId={cliente.userId}
                        pedidosCache={pedidosCache}
                        onLoad={handlePedidosLoad}
                      />
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}
