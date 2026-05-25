"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientApi } from "@/lib/api";
import type { CorujaoClienteSummary, CorujaoStats } from "@/types/portal";

type ClienteFormValues = {
  name: string;
  phone: string;
  instagram: string;
  notes: string;
  active: boolean;
};

function emptyForm(): ClienteFormValues {
  return { name: "", phone: "", instagram: "", notes: "", active: true };
}

function formFromCliente(c: CorujaoClienteSummary): ClienteFormValues {
  return {
    name: c.name,
    phone: c.phone ?? "",
    instagram: c.instagram ?? "",
    notes: c.notes ?? "",
    active: c.active
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

interface Props {
  initialClientes: CorujaoClienteSummary[];
  initialStats: CorujaoStats;
}

export function CorujaoClientesPanel({ initialClientes, initialStats }: Props) {
  const [clientes, setClientes] = useState<CorujaoClienteSummary[]>(initialClientes);
  const [stats, setStats] = useState<CorujaoStats>(initialStats);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClienteFormValues>(emptyForm());

  const [editTarget, setEditTarget] = useState<CorujaoClienteSummary | null>(null);
  const [editForm, setEditForm] = useState<ClienteFormValues>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<CorujaoClienteSummary | null>(null);

  async function reloadClientes(q = search) {
    const params = new URLSearchParams({ page: "1", limit: "200" });
    if (q) params.set("q", q);
    const { clientes: fresh, stats: freshStats } = await clientApi<{ clientes: CorujaoClienteSummary[]; stats: CorujaoStats }>(
      `/corujao/clientes?${params}`
    );
    setClientes(fresh);
    if (freshStats) setStats(freshStats);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setPending(true);
    try {
      await clientApi("/corujao/clientes", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: createForm.phone.trim() || null,
          instagram: createForm.instagram.trim() || null,
          notes: createForm.notes.trim() || null
        })
      });
      await reloadClientes();
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success("Cliente adicionado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cliente.");
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setPending(true);
    try {
      await clientApi(`/corujao/clientes/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          instagram: editForm.instagram.trim() || null,
          notes: editForm.notes.trim() || null,
          active: editForm.active
        })
      });
      await reloadClientes();
      setEditTarget(null);
      toast.success("Cliente atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await clientApi(`/corujao/clientes/${deleteTarget.id}`, { method: "DELETE" });
      await reloadClientes();
      setDeleteTarget(null);
      toast.success("Cliente removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover cliente.");
    } finally {
      setPending(false);
    }
  }

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.instagram ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes do Corujão."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Novo cliente
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalClientes}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.clientesAtivos}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.jaVieram}</p>
            <p className="text-sm text-muted-foreground">Já vieram</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalSessoes}</p>
            <p className="text-sm text-muted-foreground">Sessões</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, Instagram ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<UsersIcon className="w-8 h-8" />} title="Nenhum cliente" description="Adicione o primeiro cliente do Corujão." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Já veio?</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Confirmações</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.instagram ? `@${c.instagram.replace(/^@/, "")}` : "—"}
                  </TableCell>
                  <TableCell>
                    {c.visitouAlgumaDia ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Sim</Badge>
                    ) : (
                      <Badge variant="secondary">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.ultimaVisita ? formatDate(c.ultimaVisita) : "—"}
                  </TableCell>
                  <TableCell>{c.totalConfirmacoes}</TableCell>
                  <TableCell>
                    {c.active ? (
                      <Badge variant="outline" className="text-green-600">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditTarget(c);
                          setEditForm(formFromCliente(c));
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog: criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-1">
                <Label>Instagram</Label>
                <Input
                  value={createForm.instagram}
                  onChange={(e) => setCreateForm((f) => ({ ...f, instagram: e.target.value }))}
                  placeholder="@usuario"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Notas sobre o cliente..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Instagram</Label>
                <Input
                  value={editForm.instagram}
                  onChange={(e) => setEditForm((f) => ({ ...f, instagram: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.active}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, active: v }))}
              />
              <Label>Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: deletar */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita e todas as presenças do cliente serão removidas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={pending} onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
