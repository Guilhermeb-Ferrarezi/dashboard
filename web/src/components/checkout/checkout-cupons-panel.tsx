"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PencilIcon, PlusIcon, TagsIcon, Trash2Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientApi } from "@/lib/api";
import { formatDate as formatDateLib } from "@/lib/format";
import type { CheckoutCupomSummary } from "@/types/portal";

type CupomFormValues = {
  code: string;
  discountPercent: string;
  maxUses: string;
  expiresAt: string;
};

function emptyForm(): CupomFormValues {
  return { code: "", discountPercent: "", maxUses: "", expiresAt: "" };
}

function formFromCupom(c: CheckoutCupomSummary): CupomFormValues {
  return {
    code: c.code,
    discountPercent: String(c.discountPercent),
    maxUses: c.maxUses != null ? String(c.maxUses) : "",
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : ""
  };
}

const formatDate = formatDateLib;

export function CheckoutCuponsPanel({ initialCupons }: { initialCupons: CheckoutCupomSummary[] }) {
  const [cupons, setCupons] = useState<CheckoutCupomSummary[]>(initialCupons);
  const [pending, setPending] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CupomFormValues>(emptyForm());

  const [editTarget, setEditTarget] = useState<CheckoutCupomSummary | null>(null);
  const [editForm, setEditForm] = useState<CupomFormValues>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<CheckoutCupomSummary | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const discPct = parseInt(createForm.discountPercent, 10);
    if (!createForm.code.trim() || isNaN(discPct) || discPct < 1 || discPct > 99) {
      toast.error("Preencha o código e o desconto corretamente.");
      return;
    }
    setPending(true);
    try {
      const { cupom } = await clientApi<{ cupom: CheckoutCupomSummary }>("/checkout/cupons", {
        method: "POST",
        body: JSON.stringify({
          code: createForm.code.trim(),
          discountPercent: discPct,
          maxUses: createForm.maxUses ? parseInt(createForm.maxUses, 10) : null,
          expiresAt: createForm.expiresAt || null
        })
      });
      setCupons((prev) => [cupom, ...prev]);
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success("Cupom criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cupom.");
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const discPct = parseInt(editForm.discountPercent, 10);
    if (isNaN(discPct) || discPct < 1 || discPct > 99) {
      toast.error("Desconto deve ser entre 1 e 99%.");
      return;
    }
    setPending(true);
    try {
      const { cupom } = await clientApi<{ cupom: CheckoutCupomSummary }>(`/checkout/cupons/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          discountPercent: discPct,
          maxUses: editForm.maxUses ? parseInt(editForm.maxUses, 10) : null,
          expiresAt: editForm.expiresAt || null
        })
      });
      setCupons((prev) => prev.map((c) => (c.id === cupom.id ? cupom : c)));
      setEditTarget(null);
      toast.success("Cupom atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cupom.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await clientApi(`/checkout/cupons/${deleteTarget.id}`, { method: "DELETE" });
      setCupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Cupom removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover cupom.");
    } finally {
      setPending(false);
    }
  }

  async function handleToggleActive(cupom: CheckoutCupomSummary) {
    try {
      const { cupom: updated } = await clientApi<{ cupom: CheckoutCupomSummary }>(
        `/checkout/cupons/${cupom.id}`,
        { method: "PUT", body: JSON.stringify({ active: !cupom.active }) }
      );
      setCupons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      toast.error("Erro ao atualizar cupom.");
    }
  }

  const active = cupons.filter((c) => c.active).length;
  const totalUses = cupons.reduce((s, c) => s + c.usedCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cupons de desconto"
        description="Gerencie os cupons de desconto do checkout."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setCreateForm(emptyForm()); setCreateOpen(true); }}>
            <PlusIcon className="size-3.5" />
            Novo cupom
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total de cupons</p>
            <p className="text-2xl font-bold tabular-nums">{cupons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold tabular-nums text-green-600">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total de usos</p>
            <p className="text-2xl font-bold tabular-nums">{totalUses}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {cupons.length === 0 ? (
            <EmptyState
              icon={<TagsIcon className="size-8" />}
              title="Nenhum cupom cadastrado"
              description='Crie o primeiro cupom clicando em "Novo cupom".'
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupons.map((cupom) => {
                  const esgotado = cupom.maxUses != null && cupom.usedCount >= cupom.maxUses;
                  const expirado = cupom.expiresAt != null && new Date(cupom.expiresAt) < new Date();
                  return (
                    <TableRow key={cupom.id}>
                      <TableCell className="font-mono font-semibold tracking-wider text-sm">
                        {cupom.code}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        -{cupom.discountPercent}%
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {cupom.usedCount}{cupom.maxUses != null ? `/${cupom.maxUses}` : ""}
                        {esgotado && <span className="ml-2 text-xs text-destructive">(esgotado)</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cupom.expiresAt ? (
                          <span className={expirado ? "text-destructive" : ""}>
                            {formatDate(cupom.expiresAt)}
                            {expirado && " (expirado)"}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cupom.active}
                            onCheckedChange={() => handleToggleActive(cupom)}
                            label={cupom.active ? "Desativar" : "Ativar"}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cupom.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-7"
                            onClick={() => { setEditTarget(cupom); setEditForm(formFromCupom(cupom)); }}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(cupom)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Criar cupom */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo cupom</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Código</span>
              <Input
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO20"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Desconto (%)</span>
              <Input
                value={createForm.discountPercent}
                onChange={(e) => setCreateForm((f) => ({ ...f, discountPercent: e.target.value }))}
                placeholder="Ex: 20"
                inputMode="numeric"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Limite de usos <span className="text-muted-foreground">(opcional)</span></span>
              <Input
                value={createForm.maxUses}
                onChange={(e) => setCreateForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Ilimitado"
                inputMode="numeric"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Expira em <span className="text-muted-foreground">(opcional)</span></span>
              <Input
                type="date"
                value={createForm.expiresAt}
                onChange={(e) => setCreateForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={pending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar cupom */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cupom — {editTarget?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Desconto (%)</span>
              <Input
                value={editForm.discountPercent}
                onChange={(e) => setEditForm((f) => ({ ...f, discountPercent: e.target.value }))}
                placeholder="Ex: 20"
                inputMode="numeric"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Limite de usos <span className="text-muted-foreground">(opcional)</span></span>
              <Input
                value={editForm.maxUses}
                onChange={(e) => setEditForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Ilimitado"
                inputMode="numeric"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Expira em <span className="text-muted-foreground">(opcional)</span></span>
              <Input
                type="date"
                value={editForm.expiresAt}
                onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cupom</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover o cupom <span className="font-mono font-semibold text-foreground">{deleteTarget?.code}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" loading={pending} onClick={handleDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
