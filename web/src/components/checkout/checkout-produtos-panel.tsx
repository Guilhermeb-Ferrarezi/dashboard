"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowUpDownIcon,
  CopyIcon,
  EyeIcon,
  LinkIcon,
  MinusIcon,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clientApi, getClientApiBaseUrl } from "@/lib/api";
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
  features: string[];
  amountReais: string;
  discountPercent: string;
  imageKey: string | null;
  imageUrl: string | null;
};

function emptyForm(): ProductFormValues {
  return { name: "", features: [""], amountReais: "", discountPercent: "", imageKey: null, imageUrl: null };
}

function formFromProduct(p: CheckoutProductSummary): ProductFormValues {
  return {
    name: p.name,
    features: p.features?.length > 0 ? p.features : [p.description],
    amountReais: (p.amountCents / 100).toFixed(2),
    discountPercent: p.discountPercent != null ? String(p.discountPercent) : "",
    imageKey: p.imageKey,
    imageUrl: p.imageUrl
  };
}

function applyDiscount(cents: number, discountPercent: number | null): number {
  if (!discountPercent) return cents;
  return Math.round(cents * (1 - discountPercent / 100));
}

async function uploadProductImage(file: File): Promise<{ imageKey: string; imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", "checkout/products");

  const response = await fetch(`${getClientApiBaseUrl()}/admin/r2/images`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? "Erro ao enviar imagem.");
  }

  const data = await response.json() as { image: { key: string; url: string } };
  return { imageKey: data.image.key, imageUrl: data.image.url };
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
  onPreview: (produto: CheckoutProductSummary) => void;
}

function ProductForm({ form, setForm, pending, onSubmit, onCancel, onPreview }: ProductFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  function buildPreview(): CheckoutProductSummary {
    const cents = parseReais(form.amountReais) ?? 0;
    const features = form.features.map((f) => f.trim()).filter(Boolean);
    const discPct = form.discountPercent ? parseInt(form.discountPercent, 10) : null;
    return {
      id: 0,
      name: form.name || "Nome do produto",
      description: features[0] ?? "",
      features,
      amountCents: cents,
      discountPercent: discPct && discPct >= 1 && discPct <= 99 ? discPct : null,
      active: true,
      imageKey: form.imageKey,
      imageUrl: form.imageUrl,
      createdAt: new Date().toISOString()
    };
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { imageKey, imageUrl } = await uploadProductImage(file);
      setForm((f) => ({ ...f, imageKey, imageUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }
  function setFeature(index: number, value: string) {
    setForm((f) => {
      const updated = [...f.features];
      updated[index] = value;
      return { ...f, features: updated };
    });
  }

  function addFeature() {
    setForm((f) => ({ ...f, features: [...f.features, ""] }));
  }

  function removeFeature(index: number) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
  }

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

      <div className="space-y-1.5">
        <span className="text-xs font-medium">Benefícios</span>
        <div className="flex flex-col gap-2">
          {form.features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={feat}
                onChange={(e) => setFeature(i, e.target.value)}
                placeholder={`Ex: Acesso ao campeonato`}
              />
              {form.features.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFeature(i)}
                >
                  <MinusIcon className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-1.5 text-xs"
            onClick={addFeature}
          >
            <PlusIcon className="size-3" />
            Adicionar benefício
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium">Imagem do produto</span>
        <div className="flex items-center gap-3">
          {form.imageUrl && (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageKey: null, imageUrl: null }))}
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remover imagem"
              >
                <MinusIcon className="size-2.5" />
              </button>
            </div>
          )}
          <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}>
            {uploadingImage ? (
              <><Spinner size="sm" /> Enviando…</>
            ) : (
              <><PlusIcon className="size-3" /> {form.imageUrl ? "Trocar imagem" : "Adicionar imagem"}</>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
              disabled={uploadingImage || pending}
            />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex-1 space-y-1.5">
          <span className="text-xs font-medium">Valor (R$)</span>
          <Input
            value={form.amountReais}
            onChange={(e) => setForm((f) => ({ ...f, amountReais: e.target.value }))}
            placeholder="Ex: 29.90"
            inputMode="decimal"
            required
          />
        </label>
        <label className="w-28 space-y-1.5">
          <span className="text-xs font-medium">Desconto (%)</span>
          <Input
            value={form.discountPercent}
            onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
            placeholder="Ex: 20"
            inputMode="numeric"
          />
        </label>
      </div>
      {form.discountPercent && form.amountReais && (() => {
        const base = parseReais(form.amountReais);
        const pct = parseInt(form.discountPercent, 10);
        if (base && pct >= 1 && pct <= 99) {
          return (
            <p className="text-xs text-muted-foreground -mt-2">
              De <span className="line-through">{formatCurrency(base)}</span> por{" "}
              <span className="text-green-600 font-medium">{formatCurrency(applyDiscount(base, pct))}</span>
            </p>
          );
        }
        return null;
      })()}

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" className="mr-auto gap-1.5" onClick={() => onPreview(buildPreview())}>
          <EyeIcon className="size-3.5" />
          Pré-visualizar
        </Button>
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

function formatCurrencyPreview(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function ProductPreviewModal({
  produto,
  open,
  onClose
}: {
  produto: CheckoutProductSummary;
  open: boolean;
  onClose: () => void;
}) {
  const features = produto.features?.length > 0
    ? produto.features
    : [produto.description, "Acesso imediato após confirmação", "Pagamento PIX sem juros"].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            <EyeIcon className="size-4 text-primary" />
            Pré-visualização — visão do comprador
          </DialogTitle>
        </DialogHeader>
        <div className="p-5 flex flex-col gap-4 bg-[oklch(0.17_0.008_250)]">
          <h2 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {produto.name}
          </h2>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              O que está incluso
            </p>
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="mt-0.5 text-[#32BCAD] text-xs">✓</span>
                <span className="text-sm text-zinc-300">{f}</span>
              </div>
            ))}
          </div>

          {produto.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.imageUrl} alt={produto.name} className="w-full h-36 object-cover rounded-md" />
          )}

          <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5 text-sm text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className={produto.discountPercent ? "line-through opacity-60" : ""}>
                {formatCurrencyPreview(produto.amountCents)}
              </span>
            </div>
            {produto.discountPercent ? (
              <div className="flex justify-between text-green-400">
                <span>Desconto ({produto.discountPercent}%)</span>
                <span>-{formatCurrencyPreview(produto.amountCents - applyDiscount(produto.amountCents, produto.discountPercent))}</span>
              </div>
            ) : null}
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between font-semibold text-white">
            <span>Total hoje</span>
            <span style={{ color: "oklch(0.62 0.21 22)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.1rem" }}>
              {formatCurrencyPreview(applyDiscount(produto.amountCents, produto.discountPercent))}
            </span>
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Pagamento único. Ao pagar, você concorda com os termos de uso da Santos Games.
          </p>
        </div>
        <div className="px-5 pb-5">
          <Button variant="outline" className="w-full" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const [previewTarget, setPreviewTarget] = useState<CheckoutProductSummary | null>(null);
  const [formPreviewTarget, setFormPreviewTarget] = useState<CheckoutProductSummary | null>(null);
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
    const features = createForm.features.map((f) => f.trim()).filter(Boolean);
    if (!createForm.name.trim() || !amountCents) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setPending(true);
    try {
      const { produto } = await clientApi<{ produto: CheckoutProductSummary }>("/checkout/produtos", {
        method: "POST",
        body: JSON.stringify({ name: createForm.name.trim(), features, amountCents, discountPercent: createForm.discountPercent ? parseInt(createForm.discountPercent, 10) : null, imageKey: createForm.imageKey, imageUrl: createForm.imageUrl })
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
    const features = editForm.features.map((f) => f.trim()).filter(Boolean);
    if (!editForm.name.trim() || !amountCents) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setPending(true);
    try {
      const { produto } = await clientApi<{ produto: CheckoutProductSummary }>(`/checkout/produtos/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editForm.name.trim(), features, amountCents, discountPercent: editForm.discountPercent ? parseInt(editForm.discountPercent, 10) : null, imageKey: editForm.imageKey, imageUrl: editForm.imageUrl })
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

  async function handleToggleCorujao(produto: CheckoutProductSummary) {
    try {
      const { produto: updated } = await clientApi<{ produto: CheckoutProductSummary }>(
        `/checkout/produtos/${produto.id}`,
        { method: "PUT", body: JSON.stringify({ isCorujao: !produto.isCorujao }) }
      );
      setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.isCorujao ? "Produto marcado como Corujão." : "Produto desmarcado do Corujão.");
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

  function handleCopyLink(produto: CheckoutProductSummary) {
    const base = process.env.NEXT_PUBLIC_CHECKOUT_WEB_URL ?? "";
    navigator.clipboard.writeText(`${base}/produto/${produto.id}`);
    toast.success("Link copiado!");
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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar produto</DialogTitle>
                  </DialogHeader>
                  <ProductForm
                    form={createForm}
                    setForm={setCreateForm}
                    pending={pending}
                    onSubmit={handleCreate}
                    onCancel={() => setCreateOpen(false)}
                    onPreview={setFormPreviewTarget}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          <ProductForm
            form={editForm}
            setForm={setEditForm}
            pending={pending}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            onPreview={setFormPreviewTarget}
          />
        </DialogContent>
      </Dialog>

      <ProductPreviewModal
        produto={previewTarget ?? { id: 0, name: "", description: "", features: [], amountCents: 0, discountPercent: null, active: true, imageKey: null, imageUrl: null, createdAt: "" }}
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      <ProductPreviewModal
        produto={formPreviewTarget ?? { id: 0, name: "", description: "", features: [], amountCents: 0, discountPercent: null, active: true, imageKey: null, imageUrl: null, createdAt: "" }}
        open={!!formPreviewTarget}
        onClose={() => setFormPreviewTarget(null)}
      />

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
                    <TableHead className="w-12" />
                    <TableHead>
                      <SortButton k="name" label="Nome" />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>
                      <SortButton k="value" label="Valor" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Corujão</TableHead>
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
                      <TableCell>
                        {produto.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.imageUrl} alt="" className="size-9 rounded object-cover border border-border/40" />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded border border-border/30 bg-muted/30 text-muted-foreground/40">
                            <PackageIcon className="size-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{produto.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {produto.description}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {produto.discountPercent ? (
                          <div className="flex flex-col">
                            <span className="text-xs line-through text-muted-foreground">{formatCurrency(produto.amountCents)}</span>
                            <span className="font-medium text-green-600">{formatCurrency(applyDiscount(produto.amountCents, produto.discountPercent))}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{formatCurrency(produto.amountCents)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={produto.active}
                                onCheckedChange={() => handleToggleActive(produto)}
                                label={produto.active ? "Desativar produto" : "Ativar produto"}
                              />
                              <span className="text-xs text-muted-foreground">
                                {produto.active ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {produto.active ? "Clique para desativar" : "Clique para ativar"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={produto.isCorujao}
                          onCheckedChange={() => handleToggleCorujao(produto)}
                          label={produto.isCorujao ? "Remover do Corujão" : "Marcar como Corujão"}
                        />
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
                                onClick={() => setPreviewTarget(produto)}
                              >
                                <EyeIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Pré-visualizar</TooltipContent>
                          </Tooltip>
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
                                onClick={() => handleCopyLink(produto)}
                              >
                                <LinkIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar link de pagamento</TooltipContent>
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
