"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, PencilIcon, Trash2Icon, UsersIcon, ZapIcon } from "@/components/ui/icons";
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
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientApi } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "confirmando", label: "Confirmando", tone: "blue" },
  { value: "confirmado",  label: "Confirmado",  tone: "emerald" },
  { value: "realizado",   label: "Realizado",   tone: "muted" },
  { value: "cancelado",   label: "Cancelado",   tone: "red" },
] as const;

const JOGO_OPTIONS = [
  { value: "cs2",      label: "CS2" },
  { value: "valorant", label: "Valorant" },
  { value: "lol",      label: "LoL" },
] as const;

const MODALIDADE_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "online",     label: "Online" },
] as const;

type StatusSessao = (typeof STATUS_OPTIONS)[number]["value"];
type Jogo = (typeof JOGO_OPTIONS)[number]["value"];
type Modalidade = (typeof MODALIDADE_OPTIONS)[number]["value"];

type Sessao = {
  id: number;
  jogo: Jogo;
  dataPrevista: string;
  horario: string;
  modalidade: Modalidade;
  totalVagas: number;
  vagasPreenchidas: number;
  status: StatusSessao;
  precoCents: number;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormValues = {
  jogo: Jogo;
  dataPrevista: string;
  horario: string;
  modalidade: Modalidade;
  totalVagas: string;
  status: StatusSessao;
  precoCents: string;
  observacoes: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormValues {
  return {
    jogo: "cs2",
    dataPrevista: todayISO(),
    horario: "14:00",
    modalidade: "presencial",
    totalVagas: "10",
    status: "confirmando",
    precoCents: "0",
    observacoes: "",
  };
}

function formFromSessao(s: Sessao): FormValues {
  return {
    jogo: s.jogo,
    dataPrevista: s.dataPrevista,
    horario: s.horario,
    modalidade: s.modalidade,
    totalVagas: String(s.totalVagas),
    status: s.status,
    precoCents: String(s.precoCents / 100),
    observacoes: s.observacoes ?? "",
  };
}

function statusTone(status: StatusSessao): StatusBadgeTone {
  return STATUS_OPTIONS.find((o) => o.value === status)?.tone ?? "muted";
}

function statusLabel(status: StatusSessao) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function jogoLabel(jogo: Jogo) {
  return JOGO_OPTIONS.find((o) => o.value === jogo)?.label ?? jogo;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function formatReais(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MixSessoesLista() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Sessao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sessao | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    clientApi<{ sessoes: Sessao[] }>("/mix/sessoes")
      .then(({ sessoes }) => setSessoes(sessoes))
      .catch(() => toast.error("Erro ao carregar sessões."))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setCreateOpen(true);
  }

  function openEdit(s: Sessao) {
    setForm(formFromSessao(s));
    setEditTarget(s);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { sessao } = await clientApi<{ sessao: Sessao }>("/mix/sessoes", {
        method: "POST",
        body: JSON.stringify({
          jogo: form.jogo,
          dataPrevista: form.dataPrevista,
          horario: form.horario,
          modalidade: form.modalidade,
          totalVagas: parseInt(form.totalVagas, 10),
          status: form.status,
          precoCents: Math.round(parseFloat(form.precoCents.replace(",", ".")) * 100) || 0,
          observacoes: form.observacoes || null,
        }),
      });
      setSessoes((prev) => [sessao, ...prev]);
      setCreateOpen(false);
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
    setPending(true);
    try {
      const { sessao } = await clientApi<{ sessao: Sessao }>(`/mix/sessoes/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          jogo: form.jogo,
          dataPrevista: form.dataPrevista,
          horario: form.horario,
          modalidade: form.modalidade,
          totalVagas: parseInt(form.totalVagas, 10),
          status: form.status,
          precoCents: Math.round(parseFloat(form.precoCents.replace(",", ".")) * 100) || 0,
          observacoes: form.observacoes || null,
        }),
      });
      setSessoes((prev) => prev.map((s) => (s.id === sessao.id ? { ...sessao, vagasPreenchidas: s.vagasPreenchidas } : s)));
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
    try {
      await clientApi(`/mix/sessoes/${deleteTarget.id}`, { method: "DELETE" });
      setSessoes((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Sessão removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover sessão.");
    }
  }

  function SessaoForm({ onSubmit, onCancel }: { onSubmit: (e: React.FormEvent) => Promise<void>; onCancel: () => void }) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Jogo</span>
            <Select
              value={form.jogo}
              onValueChange={(v) => setForm((f) => ({ ...f, jogo: v as Jogo }))}
              options={JOGO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Label>
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Modalidade</span>
            <Select
              value={form.modalidade}
              onValueChange={(v) => setForm((f) => ({ ...f, modalidade: v as Modalidade }))}
              options={MODALIDADE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Data prevista</span>
            <Input
              type="date"
              value={form.dataPrevista}
              onChange={(e) => setForm((f) => ({ ...f, dataPrevista: e.target.value }))}
              required
            />
          </Label>
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Horário</span>
            <Input
              type="time"
              value={form.horario}
              onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))}
              required
            />
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Total de vagas</span>
            <Input
              type="number"
              min="1"
              value={form.totalVagas}
              onChange={(e) => setForm((f) => ({ ...f, totalVagas: e.target.value }))}
              required
            />
          </Label>
          <Label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Preço (R$)</span>
            <Input
              value={form.precoCents}
              onChange={(e) => setForm((f) => ({ ...f, precoCents: e.target.value }))}
              placeholder="Ex: 60.00"
              inputMode="decimal"
            />
          </Label>
        </div>

        <Label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Status</span>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v as StatusSessao }))}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Label>

        <Label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Observações</span>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            placeholder="Opcional"
            rows={2}
          />
        </Label>

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sessoes.length} sessão(ões)</p>
        <Button onClick={openCreate} size="sm">
          <PlusIcon className="size-3.5" />
          Nova sessão
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sessoes.length === 0 ? (
        <EmptyState
          icon={ZapIcon}
          title="Nenhuma sessão de Mix"
          description="Crie a primeira sessão usando o botão acima."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jogo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.id}</TableCell>
                <TableCell className="font-medium">{jogoLabel(s.jogo)}</TableCell>
                <TableCell>{formatDate(s.dataPrevista)}</TableCell>
                <TableCell>{s.horario}</TableCell>
                <TableCell className="capitalize">{s.modalidade}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm">
                    <UsersIcon className="size-3.5 text-muted-foreground" />
                    {s.vagasPreenchidas}/{s.totalVagas}
                  </span>
                </TableCell>
                <TableCell>{s.precoCents > 0 ? formatReais(s.precoCents) : "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone(s.status)}>{statusLabel(s.status)}</StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => openEdit(s)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova sessão de Mix</DialogTitle>
          </DialogHeader>
          <SessaoForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sessão #{editTarget?.id}</DialogTitle>
          </DialogHeader>
          <SessaoForm onSubmit={handleEdit} onCancel={() => setEditTarget(null)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remover sessão"
        description={`Remover o Mix de ${deleteTarget ? jogoLabel(deleteTarget.jogo) : ""} em ${deleteTarget ? formatDate(deleteTarget.dataPrevista) : ""}? Inscrições vinculadas serão excluídas.`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
      />
    </div>
  );
}
