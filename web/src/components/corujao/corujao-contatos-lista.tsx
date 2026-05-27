"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  DownloadIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientApi, getClientApiBaseUrl } from "@/lib/api";

import { CorujaoDeleteContatoDialog } from "./corujao-delete-contato-dialog";

const PAGE_SIZE = 50;

const ORIGEM_OPTIONS = [
  { value: "espontaneo", label: "Espontâneo" },
  { value: "anuncio", label: "Anúncio" },
  { value: "indicacao", label: "Indicação" },
  { value: "outro", label: "Outro" }
] as const;

type Origem = (typeof ORIGEM_OPTIONS)[number]["value"];

type Contato = {
  id: number;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  origem: Origem;
  jaParticipou: boolean;
  checkoutUserId: number | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaginationState = { page: number; limit: number; total: number; pages: number };

type FormValues = {
  nome: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  origem: Origem;
  observacoes: string;
};

type PatchPayload = {
  nome?: string | null;
  telefone?: string;
  email?: string | null;
  dataNascimento?: string | null;
  origem?: Origem;
  observacoes?: string | null;
};

function emptyForm(): FormValues {
  return {
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
    origem: "espontaneo",
    observacoes: ""
  };
}

// Erros lançados por clientApi/parseApiResponse trazem `error.message` com a mensagem do backend.
// instanceof falha em HMR do Vite (módulos podem ter cópias diferentes da classe), então ler direto.
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

// Espelha parseOptionalBirthDate do backend. Aceita "" (limpa) ou "YYYY-MM-DD" não-futuro.
function validateBirthForForm(input: string): { ok: true } | { ok: false; error: string } {
  if (input === "") return { ok: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return { ok: false, error: "Data de nascimento inválida." };
  const parsed = new Date(`${input}T00:00:00`);
  if (isNaN(parsed.getTime())) return { ok: false, error: "Data de nascimento inválida." };
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed.getTime() > today.getTime()) {
    return { ok: false, error: "Data de nascimento não pode ser no futuro." };
  }
  return { ok: true };
}

function formFromContato(c: Contato): FormValues {
  return {
    nome: c.nome ?? "",
    telefone: c.telefone ?? "",
    email: c.email ?? "",
    dataNascimento: c.dataNascimento ?? "",
    origem: c.origem,
    observacoes: c.observacoes ?? ""
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function origemLabel(value: Origem) {
  return ORIGEM_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <Skeleton className="h-9 w-72" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex gap-8 border-b border-border/40 px-4 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-8 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-28" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseCSV(text: string): Array<{ telefone: string; nome?: string; email?: string; dataNascimento?: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!.toLowerCase();
  const separator = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ""));

  const phoneCol = headers.findIndex((h) =>
    ["telefone", "whatsapp", "phone", "celular", "tel", "numero", "número"].includes(h)
  );
  const nameCol = headers.findIndex((h) =>
    ["nome", "name", "cliente", "contato"].includes(h)
  );
  const emailCol = headers.findIndex((h) =>
    ["email", "e-mail", "e_mail"].includes(h)
  );
  const birthCol = headers.findIndex((h) =>
    ["data_nascimento", "datanascimento", "nascimento", "data nascimento", "birthday", "aniversario", "aniversário"].includes(h)
  );

  if (phoneCol === -1) return [];

  const results: Array<{ telefone: string; nome?: string; email?: string; dataNascimento?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const telefone = cols[phoneCol]?.replace(/\D/g, "");
    if (!telefone) continue;

    const row: { telefone: string; nome?: string; email?: string; dataNascimento?: string } = { telefone };
    if (nameCol >= 0 && cols[nameCol]) row.nome = cols[nameCol];
    if (emailCol >= 0 && cols[emailCol]) row.email = cols[emailCol];
    if (birthCol >= 0 && cols[birthCol]) row.dataNascimento = cols[birthCol];
    results.push(row);
  }

  return results;
}

export function CorujaoContatosLista() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contato | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<Array<{ telefone: string; nome?: string; email?: string; dataNascimento?: string }>>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(value), 400);
  }

  async function reload() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    try {
      const res = await clientApi<{ contatos: Contato[]; pagination: PaginationState }>(
        `/corujao/contatos?${params.toString()}`
      );
      setContatos(res.contatos);
      setPagination(res.pagination);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar contatos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery]);

  async function handleExportar() {
    try {
      const response = await fetch(`${getClientApiBaseUrl()}/corujao/contatos/exportar`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao exportar.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contatos-corujao.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao exportar contatos.");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("Nenhum contato encontrado no arquivo. Verifique o formato.");
        return;
      }
      setImportData(parsed);
      setImportOpen(true);
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    if (importing || importData.length === 0) return;
    setImporting(true);
    try {
      const res = await clientApi<{
        importados: number;
        duplicados: number;
        erros: Array<{ linha: number; motivo: string }>;
        totalEnviados: number;
      }>("/corujao/contatos/importar", {
        method: "POST",
        body: JSON.stringify({ contatos: importData })
      });
      toast.success(`${res.importados} contatos importados. ${res.duplicados} duplicados ignorados.`);
      setImportOpen(false);
      setImportData([]);
      reload();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao importar contatos."));
    } finally {
      setImporting(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(contato: Contato) {
    setEditing(contato);
    setForm(formFromContato(contato));
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

    if (!form.telefone.trim()) {
      toast.error("Telefone é obrigatório.");
      return;
    }

    const birth = validateBirthForForm(form.dataNascimento);
    if (!birth.ok) {
      toast.error(birth.error);
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const diff: PatchPayload = {};
        const trimmedNome = form.nome.trim();
        if (trimmedNome !== (editing.nome ?? "")) diff.nome = trimmedNome || null;
        if (form.telefone.trim() !== (editing.telefone ?? "")) diff.telefone = form.telefone.trim();
        const trimmedEmail = form.email.trim();
        if (trimmedEmail !== (editing.email ?? "")) diff.email = trimmedEmail || null;
        if (form.dataNascimento !== (editing.dataNascimento ?? "")) {
          diff.dataNascimento = form.dataNascimento || null;
        }
        if (form.origem !== editing.origem) diff.origem = form.origem;
        const trimmedObs = form.observacoes.trim();
        if (trimmedObs !== (editing.observacoes ?? "")) diff.observacoes = trimmedObs || null;

        if (Object.keys(diff).length === 0) {
          toast.info("Nada para atualizar.");
          setSubmitting(false);
          return;
        }

        await clientApi<{ contato: Contato }>(`/corujao/contatos/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(diff)
        });
        toast.success("Contato atualizado.");
      } else {
        await clientApi<{ contato: Contato }>(`/corujao/contatos`, {
          method: "POST",
          body: JSON.stringify({
            nome: form.nome.trim() || null,
            telefone: form.telefone.trim(),
            email: form.email.trim() || null,
            dataNascimento: form.dataNascimento || null,
            origem: form.origem,
            observacoes: form.observacoes.trim() || null
          })
        });
        toast.success("Contato cadastrado.");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      reload();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao salvar contato."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && contatos.length === 0) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-[var(--card-gap)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Input
              placeholder="Buscar por nome, telefone ou email…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {!loading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {pagination.total} {pagination.total === 1 ? "contato" : "contatos"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportar} className="gap-1.5">
            <DownloadIcon className="h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <UploadIcon className="h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openCreate} className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Novo contato
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        {!loading && contatos.length === 0 ? (
          <EmptyState
            icon={query ? UsersIcon : MoonIcon}
            title={query ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
            description={
              query
                ? "Tente outros termos de busca."
                : "Comece cadastrando o primeiro contato do Corujão."
            }
            className="m-4"
          />
        ) : (
          <Table variant="linear">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : contatos.map((contato) => (
                    <TableRow key={contato.id}>
                      <TableCell className="font-medium">
                        {contato.nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contato.telefone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {origemLabel(contato.origem)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contato.jaParticipou ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-normal">
                            Participou
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            Lead
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(contato.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(contato)}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(contato)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2Icon className="mr-2 h-4 w-4" />
                              Excluir contato
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

      {pagination.pages > 1 && (
        <Pagination page={page} pageCount={pagination.pages} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contato-nome">Nome</Label>
              <Input
                id="contato-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-telefone">Telefone / WhatsApp *</Label>
              <Input
                id="contato-telefone"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">Único — não pode duplicar.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-email">Email</Label>
              <Input
                id="contato-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contato@exemplo.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-nascimento">Data de nascimento</Label>
              <Input
                id="contato-nascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-origem">Origem</Label>
              <Select
                id="contato-origem"
                value={form.origem}
                onValueChange={(value) => setForm((f) => ({ ...f, origem: value as Origem }))}
                options={ORIGEM_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-observacoes">Observações</Label>
              <Textarea
                id="contato-observacoes"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Como conheceu, contexto, etc."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CorujaoDeleteContatoDialog
        contato={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => {
          setContatos((cur) => cur.filter((c) => c.id !== id));
          setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
          setDeleteTarget(null);
        }}
      />

      <Dialog open={importOpen} onOpenChange={(open) => { if (!open && !importing) { setImportOpen(false); setImportData([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar contatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {importData.length} contatos encontrados no arquivo. Telefones duplicados serão ignorados automaticamente.
            </p>
            <div className="rounded-md border border-border/60 overflow-hidden max-h-60 overflow-y-auto">
              <Table variant="linear">
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{row.telefone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.email ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {importData.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                        …e mais {importData.length - 20} contatos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportData([]); }} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImportConfirm} disabled={importing}>
              {importing ? "Importando…" : `Importar ${importData.length} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
