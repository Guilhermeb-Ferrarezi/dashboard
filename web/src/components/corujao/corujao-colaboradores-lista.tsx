"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { MoreHorizontalIcon, PencilIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { clientApi } from "@/lib/api";

export type Colaborador = {
  id: number;
  nome: string;
  ativo: boolean;
  mongoId: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormValues = { nome: string; ativo: boolean };

function emptyForm(): FormValues {
  return { nome: "", ativo: true };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CorujaoColaboradoresLista() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await clientApi<{ colaboradores: Colaborador[] }>(`/corujao/colaboradores`);
      setColaboradores(res.colaboradores);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar colaboradores."));
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

  function openEdit(c: Colaborador) {
    setEditing(c);
    setForm({ nome: c.nome, ativo: c.ativo });
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

    if (!form.nome.trim()) {
      toast.error("Nome do colaborador é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const diff: Partial<FormValues> = {};
        if (form.nome.trim() !== editing.nome) diff.nome = form.nome.trim();
        if (form.ativo !== editing.ativo) diff.ativo = form.ativo;

        if (Object.keys(diff).length === 0) {
          toast.info("Nada para atualizar.");
          setSubmitting(false);
          return;
        }

        await clientApi(`/corujao/colaboradores/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(diff)
        });
        toast.success("Colaborador atualizado.");
      } else {
        await clientApi(`/corujao/colaboradores`, {
          method: "POST",
          body: JSON.stringify({ nome: form.nome.trim(), ativo: form.ativo })
        });
        toast.success("Colaborador criado.");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      reload();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao salvar colaborador."));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAtivo(c: Colaborador) {
    try {
      await clientApi(`/corujao/colaboradores/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !c.ativo })
      });
      setColaboradores((cur) =>
        cur.map((x) => (x.id === c.id ? { ...x, ativo: !c.ativo } : x))
      );
      toast.success(c.ativo ? "Colaborador desativado." : "Colaborador reativado.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao alterar status."));
    }
  }

  if (loading && colaboradores.length === 0) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {colaboradores.length === 0
            ? "Nenhum colaborador cadastrado."
            : `${colaboradores.length} colaborador(es) — ${colaboradores.filter((c) => c.ativo).length} ativo(s).`}
        </p>
        <Button onClick={openCreate} className="gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo colaborador
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        {!loading && colaboradores.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum colaborador cadastrado"
            description="Adicione quem fecha venda no Corujão."
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    {c.ativo ? (
                      <Badge
                        variant="outline"
                        className="font-normal bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleAtivo(c)}>
                          {c.ativo ? "Desativar" : "Reativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="colab-nome">Nome</Label>
              <Input
                id="colab-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="João da Silva"
                autoFocus
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Ativo (aparece no select de Vendido por)
            </label>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : editing ? "Salvar" : "Criar colaborador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
