"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { MoonIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientApi } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "planejado", label: "Planejado", tone: "muted" },
  { value: "aberto", label: "Aberto", tone: "blue" },
  { value: "lotado", label: "Lotado", tone: "amber" },
  { value: "realizado", label: "Realizado", tone: "emerald" },
  { value: "cancelado", label: "Cancelado", tone: "red" }
] as const;
type StatusSessao = (typeof STATUS_OPTIONS)[number]["value"];

export type Sessao = {
  id: number;
  data: string;
  totalVagas: number;
  status: StatusSessao;
  observacoes: string | null;
  vagasVendidas: number;
  vagasRestantes: number;
  createdAt: string;
  updatedAt: string;
};

type FormValues = {
  data: string;
  totalVagas: string;
  status: StatusSessao;
  observacoes: string;
};

type PatchPayload = {
  data?: string;
  totalVagas?: number;
  status?: StatusSessao;
  observacoes?: string | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormValues {
  return { data: todayISO(), totalVagas: "10", status: "planejado", observacoes: "" };
}

function formFromSessao(s: Sessao): FormValues {
  return {
    data: s.data,
    totalVagas: String(s.totalVagas),
    status: s.status,
    observacoes: s.observacoes ?? ""
  };
}

// "YYYY-MM-DD" → "26/05/2026 (sexta)". Constrói Date com T00:00:00 pra
// evitar shift de fuso em GMT-3.
function formatDataLong(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "short"
  });
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CorujaoSessoesLista() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sessao | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Sessao | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await clientApi<{ sessoes: Sessao[] }>(`/corujao/sessoes`);
      setSessoes(res.sessoes);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar sessões."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(sessao: Sessao) {
    setEditing(sessao);
    setForm(formFromSessao(sessao));
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const totalVagasNum = Number(form.totalVagas);
    if (!Number.isInteger(totalVagasNum) || totalVagasNum < 1) {
      toast.error("Total de vagas deve ser inteiro maior que 0.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const diff: PatchPayload = {};
        if (form.data !== editing.data) diff.data = form.data;
        if (totalVagasNum !== editing.totalVagas) diff.totalVagas = totalVagasNum;
        if (form.status !== editing.status) diff.status = form.status;
        const trimmedObs = form.observacoes.trim();
        if (trimmedObs !== (editing.observacoes ?? "")) diff.observacoes = trimmedObs || null;

        if (Object.keys(diff).length === 0) {
          toast.info("Nada para atualizar.");
          setSubmitting(false);
          return;
        }

        await clientApi<{ sessao: Sessao }>(`/corujao/sessoes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(diff)
        });
        toast.success("Sessão atualizada.");
      } else {
        await clientApi<{ sessao: Sessao }>(`/corujao/sessoes`, {
          method: "POST",
          body: JSON.stringify({
            data: form.data,
            totalVagas: totalVagasNum,
            status: form.status,
            observacoes: form.observacoes.trim() || null
          })
        });
        toast.success("Sessão criada.");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      reload();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao salvar sessão."));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: number, status: StatusSessao) {
    setRowBusy(id);
    try {
      const res = await clientApi<{ sessao: Sessao }>(`/corujao/sessoes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setSessoes((cur) => cur.map((s) => (s.id === id ? res.sessao : s)));
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao atualizar status."));
    } finally {
      setRowBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await clientApi<{ deletedId: number; visitasOrfanizadas: number }>(
        `/corujao/sessoes/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      setSessoes((cur) => cur.filter((s) => s.id !== deleteTarget.id));
      const msg =
        res.visitasOrfanizadas > 0
          ? `Sessão apagada. ${res.visitasOrfanizadas} visita${res.visitasOrfanizadas === 1 ? "" : "s"} desvinculada${res.visitasOrfanizadas === 1 ? "" : "s"}.`
          : "Sessão apagada.";
      toast.success(msg);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao apagar sessão."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading && sessoes.length === 0) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sessoes.length === 0
            ? "Nenhuma sessão cadastrada."
            : `${sessoes.length} sessão(ões) — ordenada(s) da mais recente.`}
        </p>
        <Button onClick={openCreate} className="gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Nova sessão
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        {!loading && sessoes.length === 0 ? (
          <EmptyState
            icon={MoonIcon}
            title="Nenhuma sessão cadastrada"
            description="Comece criando a próxima noite do Corujão."
            className="m-4"
          />
        ) : (
          <Table variant="linear">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vagas</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessoes.map((sessao) => {
                const statusOpt = STATUS_OPTIONS.find((o) => o.value === sessao.status);
                const lotada = sessao.vagasVendidas >= sessao.totalVagas;
                const busy = rowBusy === sessao.id;
                return (
                  <TableRow key={sessao.id}>
                    <TableCell className="font-medium">{formatDataLong(sessao.data)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 -mx-2 px-2 font-normal"
                            disabled={busy}
                          >
                            <StatusBadge tone={(statusOpt?.tone ?? "muted") as StatusBadgeTone}>
                              {statusOpt?.label ?? sessao.status}
                            </StatusBadge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {STATUS_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt.value}
                              onClick={() => updateStatus(sessao.id, opt.value)}
                            >
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <span className={lotada ? "text-amber-400" : ""}>
                        {sessao.vagasVendidas} / {sessao.totalVagas}
                      </span>
                      {lotada && (
                        <StatusBadge tone="amber" className="ml-2">
                          Lotado
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell
                      className="max-w-[260px] truncate text-sm text-muted-foreground"
                      title={sessao.observacoes ?? ""}
                    >
                      {sessao.observacoes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(sessao)}>
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(sessao)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Excluir sessão
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

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sessão" : "Nova sessão"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sessao-data">Data</Label>
                <Input
                  id="sessao-data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sessao-vagas">Total de vagas</Label>
                <Input
                  id="sessao-vagas"
                  type="number"
                  min={1}
                  step={1}
                  value={form.totalVagas}
                  onChange={(e) => setForm((f) => ({ ...f, totalVagas: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sessao-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value as StatusSessao }))
                }
                options={STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                placeholder="Selecionar status…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sessao-obs">Observações</Label>
              <Textarea
                id="sessao-obs"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Tema da noite, atração, lembrete…"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : editing ? "Salvar" : "Criar sessão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar sessão?</DialogTitle>
          </DialogHeader>
          {deleteTarget ? (
            <div className="space-y-3 text-sm">
              <p>
                Sessão de{" "}
                <span className="font-medium capitalize text-foreground">
                  {formatDataLong(deleteTarget.data)}
                </span>
                . Esta ação é irreversível.
              </p>
              {deleteTarget.vagasVendidas > 0 ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-amber-400">
                  Atenção: <strong>{deleteTarget.vagasVendidas}</strong>{" "}
                  visita{deleteTarget.vagasVendidas === 1 ? "" : "s"} amarrada
                  {deleteTarget.vagasVendidas === 1 ? "" : "s"} a esta sessão.
                  {" "}Ao apagar, ela
                  {deleteTarget.vagasVendidas === 1 ? "" : "s"} {deleteTarget.vagasVendidas === 1 ? "vira" : "viram"}
                  {" "}avulsa{deleteTarget.vagasVendidas === 1 ? "" : "s"} (mantêm valor e
                  atribuição, mas desaparecem do agrupamento por sessão nos relatórios).
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              <Trash2Icon className="size-4" />
              {deleting ? "Apagando…" : "Apagar sessão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
