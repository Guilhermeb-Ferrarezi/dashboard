"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageIcon, PlusIcon, Trash2Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <Input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Ex: Acesso completo por 1 mês"
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

function parseReais(value: string): number | null {
  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100);
}

interface CheckoutProdutosPanelProps {
  initialProdutos: CheckoutProductSummary[];
}

export function CheckoutProdutosPanel({ initialProdutos }: CheckoutProdutosPanelProps) {
  const [produtos, setProdutos] = useState(initialProdutos);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CheckoutProductSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CheckoutProductSummary | null>(null);
  const [createForm, setCreateForm] = useState<ProductFormValues>(emptyForm());
  const [editForm, setEditForm] = useState<ProductFormValues>(emptyForm());
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [produtos, query]);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    await clientApi(`/checkout/produtos/${deleteTarget.id}`, { method: "DELETE" });
    setProdutos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Produto removido.");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Checkout"
        title="Produtos"
        description="Catálogo de produtos e planos disponíveis para venda."
        actions={
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
        }
      />

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

      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 py-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PackageIcon className="size-3.5" />
              </span>
              {produtos.length} produto{produtos.length !== 1 ? "s" : ""}
            </span>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
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
                    <TableCell className="tabular-nums">
                      {formatCurrency(produto.amountCents)}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(produto)}
                        className="cursor-pointer"
                        title={produto.active ? "Clique para desativar" : "Clique para ativar"}
                      >
                        <Badge variant={produto.active ? "default" : "secondary"}>
                          {produto.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(produto.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openEdit(produto)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(produto)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
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
