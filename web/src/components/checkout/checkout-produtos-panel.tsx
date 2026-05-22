"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowUpDownIcon,
  CopyIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  ShoppingCartIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clientApi } from "@/lib/api";
import type { CheckoutProductSummary } from "@/types/portal";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

type ProductFormValues = {
  name: string;
  description: string;
  amountReais: string;
};

function emptyForm(): ProductFormValues {
  return { name: "", description: "", amountReais: "" };
}

function formFromProduct(p: CheckoutProductSummary): ProductFormValues {
  return {
    name: p.name,
    description: p.description,
    amountReais: (p.amountCents / 100).toFixed(2)
  };
}

function parseReais(value: string): number | null {
  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100);
}

interface ProductFormProps {
  form: ProductFormValues;
  setForm: React.Dispatch<React.SetStateAction<ProductFormValues>>;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

function ProductForm({ form, setForm, pending, onSubmit, onCancel }: ProductFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="space-y-1.5">
        <span className="text-xs font-medium">Nome</span>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex: Plano Premium"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium">Descrição</span>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Ex: Acesso completo por 1 mês"
          rows={3}
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium">Valor (R$)</span>
        <Input
          value={form.amountReais}
          onChange={(e) => setForm((f) => ({ ...f, amountReais: e.target.value }))}
          placeholder="Ex: 29.90"
          inputMode="decimal"
          required
        />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

type SortKey = "name" | "value" | "date";
type SortDir = "asc" | "desc";
type TabFilter = "all" | "active" | "inactive";

interface CheckoutProdutosPanelProps {
  initialProdutos: CheckoutProductSummary[];
}

export function CheckoutProdutosPanel({ initialProdutos }: CheckoutProdutosPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [produtos, setProdutos] = useState(initialProdutos);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CheckoutProductSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CheckoutProductSummary | null>(null);
  const [createForm, setCreateForm] = useState<ProductFormValues>(emptyForm());
  const [editForm, setEditForm] = useState<ProductFormValues>(emptyForm());
  const [pending, setPending] = useState(false);

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const stats = useMemo(() => {
    const ativos = produtos.filter((p) => p.active);
    const inativos = produtos.filter((p) => !p.active);
    const valores = produtos.map((p) => p.amountCents);
    const min = valores.length ? Math.min(...valores) : 0;
    const max = valores.length ? Math.max(...valores) : 0;
    return { total: produtos.length, ativos: ativos.length, inativos: inativos.length, min, max };
  }, [produtos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = produtos;

    if (tab === "active") list = list.filter((p) => p.active);
    else if (tab === "inactive") list = list.filter((p) => !p.active);

    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "pt-BR");
      else if (sortKey === "value") cmp = a.amountCents - b.amountCents;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [produtos, query, tab, sortKey, sortDir]);

  function openCreate() {
    setCreateForm(emptyForm());
    setCreateOpen(true);
  }

  function openEdit(produto: CheckoutProductSummary) {
    setEditForm(formFromProduct(produto));
    setEditTarget(produto);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = parseReais(createForm.amountReais);
    if (!createForm.name.trim() || !createForm.description.trim() || !amountCents) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setPending(true);
    try {
      const { produto } = await clientApi<{ produto: CheckoutProductSummary }>("/checkout/produtos", {
        method: "POST",
        body: JSON.stringify({ name: createForm.name.trim(), description: createForm.description.trim(), amountCents })
      });
      setProdutos((prev) => [produto, ...prev]);
      setCreateOpen(false);
      toast.success("Produto criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto.");
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const amountCents = parseReais(editForm.amountReais);
    if (!editForm.name.trim() || !editForm.description.trim() || !amountCents) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setPending(true);
    try {
      const { produto } = await clientApi<{ produto: CheckoutProductSummary }>(`/checkout/produtos/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim(), amountCents })
      });
      setProdutos((prev) => prev.map((p) => (p.id === produto.id ? produto : p)));
      setEditTarget(null);
      toast.success("Produto atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar produto.");
    } finally {
      setPending(false);
    }
  }

  async function handleToggleActive(produto: CheckoutProductSummary) {
    try {
      const { produto: updated } = await clientApi<{ produto: CheckoutProductSummary }>(
        `/checkout/produtos/${produto.id}`,
        { method: "PUT", body: JSON.stringify({ active: !produto.active }) }
      );
      setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.active ? "Produto ativado." : "Produto desativado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar produto.");
    }
  }

  async function handleDuplicate(produto: CheckoutProductSummary) {
    setPending(true);
    try {
      const { produto: novo } = await clientApi<{ produto: CheckoutProductSummary }>("/checkout/produtos", {
        method: "POST",
        body: JSON.stringify({
          name: `${produto.name} (cópia)`,
          description: produto.description,
          amountCents: produto.amountCents
        })
      });
      setProdutos((prev) => [novo, ...prev]);
      toast.success("Produto duplicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar produto.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await clientApi(`/checkout/produtos/${deleteTarget.id}`, { method: "DELETE" });
    setProdutos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Produto removido.");
  }

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDownIcon
        className={`size-3 transition-opacity ${sortKey === k ? "opacity-100 text-primary" : "opacity-40"}`}
      />
    </button>
  );

  return (
    <div className={`flex flex-col gap-6 transition-opacity${isPending ? " pointer-events-none opacity-60" : ""}`}>
      <PageHeader
        eyebrow="Checkout"
        title="Produtos"
        description="Catálogo de produtos e planos disponíveis para venda."
        actions={
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger render={<Button onClick={openCreate} />}>
                  <PlusIcon />
                  Novo produto
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar produto</DialogTitle>
                  </DialogHeader>
                  <ProductForm
                    form={createForm}
                    setForm={setCreateForm}
                    pending={pending}
                    onSubmit={handleCreate}
                    onCancel={() => setCreateOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleRefresh}
                    disabled={isPending}
                    aria-label="Atualizar"
                    className="group/refresh relative size-8 rounded-md"
                  >
                    {isPending
                      ? <Spinner size="sm" />
                      : <RefreshCcwIcon className="size-3.5 transition-transform duration-300 group-hover/refresh:rotate-90" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PackageIcon}
          label="Total de produtos"
          value={stats.total.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={ZapIcon}
          iconTone="bg-emerald-500/10 text-emerald-400"
          label="Ativos"
          value={stats.ativos.toLocaleString("pt-BR")}
          hint={stats.total > 0 ? `${Math.round((stats.ativos / stats.total) * 100)}% do catálogo` : undefined}
        />
        <StatCard
          icon={ShoppingCartIcon}
          iconTone="bg-zinc-500/10 text-zinc-400"
          label="Inativos"
          value={stats.inativos.toLocaleString("pt-BR")}
        />
        <StatCard
          icon={SparklesIcon}
          iconTone="bg-amber-500/10 text-amber-400"
          label="Faixa de preço"
          value={stats.total > 0 ? (stats.min === stats.max ? formatCurrency(stats.min) : `${formatCurrency(stats.min)} – ${formatCurrency(stats.max)}`) : "—"}
          hint={stats.total > 0 && stats.min !== stats.max ? "mínimo – máximo" : undefined}
        />
      </div>

      {/* Dialogs */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          <ProductForm
            form={editForm}
            setForm={setEditForm}
            pending={pending}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remover produto"
        description={`Tem certeza que deseja remover "${deleteTarget?.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
      />

      {/* Table */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 py-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PackageIcon className="size-3.5" />
              </span>
              <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
                <TabsList variant="default">
                  <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="active">Ativos ({stats.ativos})</TabsTrigger>
                  <TabsTrigger value="inactive">Inativos ({stats.inativos})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Input
              placeholder="Buscar produto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-56 text-sm"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Nenhum produto encontrado"
              description={query ? "Tente outro termo de busca." : "Crie o primeiro produto usando o botão acima."}
              className="m-4"
            />
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <SortButton k="name" label="Nome" />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>
                      <SortButton k="value" label="Valor" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <SortButton k="date" label="Criado em" />
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {produto.id}
                      </TableCell>
                      <TableCell className="font-medium">{produto.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {produto.description}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatCurrency(produto.amountCents)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleToggleActive(produto)}
                              className="cursor-pointer"
                            >
                              <Badge variant={produto.active ? "default" : "secondary"}>
                                {produto.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {produto.active ? "Clique para desativar" : "Clique para ativar"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(produto.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7"
                                onClick={() => openEdit(produto)}
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7"
                                onClick={() => handleDuplicate(produto)}
                                disabled={pending}
                              >
                                <CopyIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(produto)}
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
