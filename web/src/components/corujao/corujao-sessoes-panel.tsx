"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientApi } from "@/lib/api";
import type { CorujaoClienteSummary, CorujaoPresencaStatus, CorujaoPresencaSummary, CorujaoSessaoStatus, CorujaoSessaoSummary } from "@/types/portal";

type SessaoFormValues = {
  date: string;
  title: string;
  status: CorujaoSessaoStatus;
  clienteIds: number[];
};

function emptyForm(): SessaoFormValues {
  return { date: "", title: "", status: "planned", clienteIds: [] };
}

function formFromSessao(s: CorujaoSessaoSummary, presencas: CorujaoPresencaSummary[]): SessaoFormValues {
  return { date: s.date, title: s.title ?? "", status: s.status, clienteIds: presencas.map((p) => p.clienteId) };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const SESSAO_STATUS_LABELS: Record<CorujaoSessaoStatus, string> = {
  planned: "Planejado", done: "Realizado", cancelled: "Cancelado"
};

const PRESENCA_LABELS: Record<CorujaoPresencaStatus, string> = {
  pending: "Pendente", confirmed: "Confirmado", attended: "Presente", absent: "Ausente"
};

const PRESENCA_NEXT: Record<CorujaoPresencaStatus, CorujaoPresencaStatus> = {
  pending: "confirmed", confirmed: "attended", attended: "absent", absent: "pending"
};

const PRESENCA_CLASS: Record<CorujaoPresencaStatus, string> = {
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200",
  attended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200"
};

const SESSAO_BADGE_CLASS: Record<CorujaoSessaoStatus, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
};

// ── Multi-select de clientes ──────────────────────────────────────────────────

function ClienteMultiSelect({
  selected,
  onChange
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [todos, setTodos] = useState<CorujaoClienteSummary[]>([]);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    clientApi<{ clientes: CorujaoClienteSummary[] }>("/corujao/clientes?limit=200")
      .then(({ clientes }) => setTodos(clientes))
      .catch(() => {});
  }, []);

  const selectedClientes = todos.filter((c) => selected.includes(c.id));
  const unselected = todos.filter((c) => !selected.includes(c.id) && (
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.instagram ?? "").toLowerCase().includes(search.toLowerCase())
  ));

  function add(id: number) { onChange([...selected, id]); setSearch(""); }
  function remove(id: number) { onChange(selected.filter((x) => x !== id)); }

  return (
    <div className="space-y-2">
      {/* Clientes já selecionados como tags */}
      {selectedClientes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border rounded min-h-9 bg-muted/30">
          {selectedClientes.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
              {c.name}
              <button type="button" onClick={() => remove(c.id)} className="hover:text-destructive transition-colors">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Botão para abrir busca */}
      {!showList ? (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowList(true)}>
          <PlusIcon className="w-3.5 h-3.5 mr-1" /> Adicionar cliente
        </Button>
      ) : (
        <div className="space-y-1.5">
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="max-h-36 overflow-y-auto border rounded space-y-0.5 p-1">
            {unselected.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">Nenhum cliente disponível.</p>}
            {unselected.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c.id)}
                className="w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between gap-2 hover:bg-muted transition-colors"
              >
                <span className="truncate font-medium">{c.name}</span>
                {c.instagram && <span className="text-xs text-muted-foreground">@{c.instagram}</span>}
              </button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { setShowList(false); setSearch(""); }}>
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

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
  const [addSearch, setAddSearch] = useState("");
  const [todosClientes, setTodosClientes] = useState<CorujaoClienteSummary[]>([]);
  const [showAddCliente, setShowAddCliente] = useState(false);

  useEffect(() => {
    reloadSessoes();
  }, []);

  async function reloadSessoes() {
    const { sessoes: fresh } = await clientApi<{ sessoes: CorujaoSessaoSummary[] }>("/corujao/sessoes");
    setSessoes(fresh);
  }

  async function openSheet(s: CorujaoSessaoSummary) {
    setSheetSessao(s);
    setShowAddCliente(false);
    setAddSearch("");
    setPresencasPending(true);
    try {
      const [{ presencas: p }, { clientes }] = await Promise.all([
        clientApi<{ presencas: CorujaoPresencaSummary[] }>(`/corujao/sessoes/${s.id}/presencas`),
        clientApi<{ clientes: CorujaoClienteSummary[] }>("/corujao/clientes?limit=200")
      ]);
      setPresencas(p);
      setTodosClientes(clientes);
    } catch {
      toast.error("Erro ao carregar presenças.");
    } finally {
      setPresencasPending(false);
    }
  }

  async function togglePresenca(clienteId: number, current: CorujaoPresencaStatus) {
    if (!sheetSessao) return;
    const next = PRESENCA_NEXT[current];
    setPresencas((prev) => prev.map((p) => p.clienteId === clienteId ? { ...p, status: next } : p));
    try {
      await clientApi(`/corujao/sessoes/${sheetSessao.id}/presencas/${clienteId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next })
      });
    } catch {
      setPresencas((prev) => prev.map((p) => p.clienteId === clienteId ? { ...p, status: current } : p));
      toast.error("Erro ao atualizar.");
    }
  }

  async function removeClienteFromSessao(clienteId: number) {
    if (!sheetSessao) return;
    setPresencas((prev) => prev.filter((p) => p.clienteId !== clienteId));
    try {
      await clientApi(`/corujao/sessoes/${sheetSessao.id}/presencas/${clienteId}`, { method: "DELETE" });
      await reloadSessoes();
    } catch {
      toast.error("Erro ao remover cliente da sessão.");
      openSheet(sheetSessao);
    }
  }

  async function addClienteToSessao(clienteId: number) {
    if (!sheetSessao) return;
    const cliente = todosClientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    try {
      await clientApi(`/corujao/sessoes/${sheetSessao.id}/presencas/${clienteId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" })
      });
      setPresencas((prev) => [...prev, {
        clienteId: cliente.id,
        clienteName: cliente.name,
        clientePhone: cliente.phone,
        clienteInstagram: cliente.instagram,
        status: "pending"
      }]);
      setShowAddCliente(false);
      setAddSearch("");
      await reloadSessoes();
    } catch {
      toast.error("Erro ao adicionar cliente.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.date) { toast.error("Data é obrigatória."); return; }
    setPending(true);
    try {
      await clientApi("/corujao/sessoes", {
        method: "POST",
        body: JSON.stringify({
          date: createForm.date,
          title: createForm.title.trim() || null,
          status: createForm.status,
          clienteIds: createForm.clienteIds
        })
      });
      await reloadSessoes();
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success("Sessão criada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sessão.");
    } finally { setPending(false); }
  }

  async function openEdit(s: CorujaoSessaoSummary) {
    const { presencas: p } = await clientApi<{ presencas: CorujaoPresencaSummary[] }>(`/corujao/sessoes/${s.id}/presencas`);
    setEditTarget(s);
    setEditForm(formFromSessao(s, p));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.date) { toast.error("Data é obrigatória."); return; }
    setPending(true);
    try {
      await clientApi(`/corujao/sessoes/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          date: editForm.date,
          title: editForm.title.trim() || null,
          status: editForm.status,
          clienteIds: editForm.clienteIds
        })
      });
      await reloadSessoes();
      setEditTarget(null);
      toast.success("Sessão atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar sessão.");
    } finally { setPending(false); }
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
    } finally { setPending(false); }
  }

  const clientesNaSessao = new Set(presencas.map((p) => p.clienteId));
  const clientesParaAdicionar = todosClientes.filter((c) =>
    !clientesNaSessao.has(c.id) &&
    (!addSearch || c.name.toLowerCase().includes(addSearch.toLowerCase()) || (c.instagram ?? "").toLowerCase().includes(addSearch.toLowerCase()))
  );

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
        <EmptyState icon={CalendarIcon} title="Nenhuma sessão" description="Crie a primeira sessão do Corujão." />
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
                <TableHead className="w-32" />
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
                      <Button variant="outline" size="sm" onClick={() => openSheet(s)}>Presenças</Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(s)}>
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

          {presencasPending ? (
            <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
          ) : (
            <div className="mt-4 space-y-1">
              {presencas.length === 0 && !showAddCliente && (
                <p className="text-sm text-muted-foreground pb-2">Nenhum cliente nessa sessão ainda.</p>
              )}

              {presencas.map((p) => (
                <div key={p.clienteId} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.clienteName}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {p.clienteInstagram && <span>@{p.clienteInstagram}</span>}
                      {p.clientePhone && <span>{p.clientePhone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${PRESENCA_CLASS[p.status as CorujaoPresencaStatus]}`}
                      onClick={() => togglePresenca(p.clienteId, p.status as CorujaoPresencaStatus)}
                    >
                      {PRESENCA_LABELS[p.status as CorujaoPresencaStatus]}
                    </button>
                    <button
                      onClick={() => removeClienteFromSessao(p.clienteId)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover da sessão"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Adicionar cliente */}
              {showAddCliente ? (
                <div className="pt-3 space-y-2">
                  <Input
                    placeholder="Buscar cliente para adicionar..."
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {clientesParaAdicionar.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">Nenhum cliente disponível.</p>
                    )}
                    {clientesParaAdicionar.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted flex items-center justify-between gap-2"
                        onClick={() => addClienteToSessao(c.id)}
                      >
                        <span className="truncate font-medium">{c.name}</span>
                        {c.instagram && <span className="text-xs text-muted-foreground">@{c.instagram}</span>}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setShowAddCliente(false); setAddSearch(""); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowAddCliente(true)}>
                  <PlusIcon className="w-4 h-4 mr-1" /> Adicionar cliente
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova sessão</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={createForm.date} onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))} />
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
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Corujão de novembro" />
            </div>
            <div className="space-y-1">
              <Label>Clientes ({createForm.clienteIds.length} selecionado(s))</Label>
              <ClienteMultiSelect selected={createForm.clienteIds} onChange={(ids) => setCreateForm((f) => ({ ...f, clienteIds: ids }))} />
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar sessão</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
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
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Clientes ({editForm.clienteIds.length} selecionado(s))</Label>
              <ClienteMultiSelect selected={editForm.clienteIds} onChange={(ids) => setEditForm((f) => ({ ...f, clienteIds: ids }))} />
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
          <DialogHeader><DialogTitle>Remover sessão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover a sessão de <strong>{deleteTarget ? formatDate(deleteTarget.date) : ""}</strong>?
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
