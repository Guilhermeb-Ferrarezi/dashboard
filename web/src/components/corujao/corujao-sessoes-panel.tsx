"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarIcon, PencilIcon, PlusIcon, Trash2Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientApi } from "@/lib/api";
import type { CorujaoPresencaStatus, CorujaoPresencaSummary, CorujaoSessaoStatus, CorujaoSessaoSummary } from "@/types/portal";

type SessaoFormValues = {
  date: string;
  title: string;
  status: CorujaoSessaoStatus;
};

function emptyForm(): SessaoFormValues {
  return { date: "", title: "", status: "planned" };
}

function formFromSessao(s: CorujaoSessaoSummary): SessaoFormValues {
  return { date: s.date, title: s.title ?? "", status: s.status };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const SESSAO_STATUS_LABELS: Record<CorujaoSessaoStatus, string> = {
  planned: "Planejado",
  done: "Realizado",
  cancelled: "Cancelado"
};

const PRESENCA_STATUS_LABELS: Record<CorujaoPresencaStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  attended: "Presente",
  absent: "Ausente"
};

const PRESENCA_NEXT: Record<CorujaoPresencaStatus, CorujaoPresencaStatus> = {
  pending: "confirmed",
  confirmed: "attended",
  attended: "absent",
  absent: "pending"
};

const PRESENCA_BADGE_CLASS: Record<CorujaoPresencaStatus, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200",
  attended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200"
};

const SESSAO_BADGE_CLASS: Record<CorujaoSessaoStatus, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
};

interface Props {
  initialSessoes: CorujaoSessaoSummary[];
}

export function CorujaoSessoesPanel({ initialSessoes }: Props) {
  const [sessoes, setSessoes] = useState<CorujaoSessaoSummary[]>(initialSessoes);
  const [pending, setPending] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SessaoFormValues>(emptyForm());

  const [editTarget, setEditTarget] = useState<CorujaoSessaoSummary | null>(null);
  const [editForm, setEditForm] = useState<SessaoFormValues>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<CorujaoSessaoSummary | null>(null);

  const [sheetSessao, setSheetSessao] = useState<CorujaoSessaoSummary | null>(null);
  const [presencas, setPresencas] = useState<CorujaoPresencaSummary[]>([]);
  const [presencasPending, setPresencasPending] = useState(false);

  async function reloadSessoes() {
    const { sessoes: fresh } = await clientApi<{ sessoes: CorujaoSessaoSummary[] }>("/corujao/sessoes");
    setSessoes(fresh);
  }

  async function openSheet(s: CorujaoSessaoSummary) {
    setSheetSessao(s);
    setPresencasPending(true);
    try {
      const { presencas: p } = await clientApi<{ presencas: CorujaoPresencaSummary[] }>(`/corujao/sessoes/${s.id}/presencas`);
      setPresencas(p);
    } catch {
      toast.error("Erro ao carregar presenças.");
    } finally {
      setPresencasPending(false);
    }
  }

  async function togglePresenca(clienteId: number, current: CorujaoPresencaStatus) {
    if (!sheetSessao) return;
    const next = PRESENCA_NEXT[current];
    const oldPresencas = presencas;
    setPresencas((prev) =>
      prev.map((p) => (p.clienteId === clienteId ? { ...p, status: next } : p))
    );
    try {
      await clientApi(`/corujao/sessoes/${sheetSessao.id}/presencas/${clienteId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next })
      });
    } catch {
      setPresencas(oldPresencas);
      toast.error("Erro ao atualizar presença.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.date) {
      toast.error("Data é obrigatória.");
      return;
    }
    setPending(true);
    try {
      await clientApi("/corujao/sessoes", {
        method: "POST",
        body: JSON.stringify({
          date: createForm.date,
          title: createForm.title.trim() || null,
          status: createForm.status
        })
      });
      await reloadSessoes();
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success("Sessão criada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sessão.");
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.date) {
      toast.error("Data é obrigatória.");
      return;
    }
    setPending(true);
    try {
      await clientApi(`/corujao/sessoes/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          date: editForm.date,
          title: editForm.title.trim() || null,
          status: editForm.status
        })
      });
      await reloadSessoes();
      setEditTarget(null);
      toast.success("Sessão atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar sessão.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await clientApi(`/corujao/sessoes/${deleteTarget.id}`, { method: "DELETE" });
      await reloadSessoes();
      setDeleteTarget(null);
      toast.success("Sessão removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover sessão.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sessões"
        description="Gerencie as sessões do Corujão e as presenças."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Nova sessão
          </Button>
        }
      />

      {sessoes.length === 0 ? (
        <EmptyState icon={<CalendarIcon className="w-8 h-8" />} title="Nenhuma sessão" description="Crie a primeira sessão do Corujão." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmados</TableHead>
                <TableHead>Presentes</TableHead>
                <TableHead>Pendentes</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{formatDate(s.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.title ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={SESSAO_BADGE_CLASS[s.status]}>{SESSAO_STATUS_LABELS[s.status]}</Badge>
                  </TableCell>
                  <TableCell>{s.confirmados}</TableCell>
                  <TableCell>{s.presentes}</TableCell>
                  <TableCell>{s.pendentes}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openSheet(s)}>
                        Presenças
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditTarget(s);
                          setEditForm(formFromSessao(s));
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(s)}
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

      {/* Sheet: presenças */}
      <Sheet open={!!sheetSessao} onOpenChange={(o) => !o && setSheetSessao(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Presenças — {sheetSessao ? formatDate(sheetSessao.date) : ""}
              {sheetSessao?.title ? ` (${sheetSessao.title})` : ""}
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-2 mb-4">
            Clique no badge de status para alternar: Pendente → Confirmado → Presente → Ausente
          </p>
          {presencasPending ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : presencas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {presencas.map((p) => (
                <div key={p.clienteId} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.clienteName}</p>
                    {p.clienteInstagram && (
                      <p className="text-xs text-muted-foreground">@{p.clienteInstagram.replace(/^@/, "")}</p>
                    )}
                    {p.clientePhone && (
                      <p className="text-xs text-muted-foreground">{p.clientePhone}</p>
                    )}
                  </div>
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${PRESENCA_BADGE_CLASS[p.status]}`}
                    onClick={() => togglePresenca(p.clienteId, p.status)}
                  >
                    {PRESENCA_STATUS_LABELS[p.status]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: criar sessão */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova sessão</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Corujão de novembro"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as CorujaoSessaoStatus }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="planned">Planejado</option>
                <option value="done">Realizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar sessão */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sessão</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CorujaoSessaoStatus }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="planned">Planejado</option>
                <option value="done">Realizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: deletar sessão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover sessão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover a sessão de{" "}
            <strong>{deleteTarget ? formatDate(deleteTarget.date) : ""}</strong>?
            Todas as presenças desta sessão serão removidas.
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
