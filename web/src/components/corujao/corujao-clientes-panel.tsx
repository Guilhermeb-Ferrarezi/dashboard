"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PencilIcon, PlusIcon, Trash2Icon, UploadIcon, UsersIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientApi } from "@/lib/api";
import type { CorujaoClienteSummary, CorujaoStats } from "@/types/portal";

type ClienteFormValues = {
  name: string;
  phone: string;
  instagram: string;
  active: boolean;
  respondeu: boolean;
  jaVeio: boolean;
  ultimaVisita: string;
  confirmouData: string;
};

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

function emptyForm(): ClienteFormValues {
  return { name: "", phone: "", instagram: "", active: true, respondeu: false, jaVeio: false, ultimaVisita: "", confirmouData: "" };
}

function formFromCliente(c: CorujaoClienteSummary): ClienteFormValues {
  return {
    name: c.name,
    phone: c.phone ?? "",
    instagram: c.instagram ?? "",
    active: c.active,
    respondeu: c.respondeu,
    jaVeio: c.jaVeio,
    ultimaVisita: c.ultimaVisita ?? "",
    confirmouData: c.confirmouData ?? ""
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Formulário base ───────────────────────────────────────────────────────────

function ClienteForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  pending,
  submitLabel
}: {
  form: ClienteFormValues;
  setForm: (fn: (f: ClienteFormValues) => ClienteFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Nome */}
      <div className="space-y-1">
        <Label>Nome *</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
      </div>

      {/* Contato */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Telefone / WhatsApp</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
            placeholder="(11) 99999-9999"
            inputMode="numeric"
            className={form.phone && !isValidPhone(form.phone) ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {form.phone && !isValidPhone(form.phone) && (
            <p className="text-xs text-destructive">Número inválido</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Instagram</Label>
          <Input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
        </div>
      </div>

      {/* Toggles */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Respondeu ao Corujão</Label>
          <Switch checked={form.respondeu} onCheckedChange={(v) => setForm((f) => ({ ...f, respondeu: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Já veio alguma vez</Label>
          <Switch checked={form.jaVeio} onCheckedChange={(v) => setForm((f) => ({ ...f, jaVeio: v, ultimaVisita: v ? f.ultimaVisita : "" }))} />
        </div>
      </div>

      {/* Datas — só mostra campos de data se relevante */}
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1">
          <Label className={`block truncate ${!form.jaVeio ? "text-muted-foreground" : ""}`}>Última visita</Label>
          <Input
            type="date"
            value={form.ultimaVisita}
            disabled={!form.jaVeio}
            onChange={(e) => setForm((f) => ({ ...f, ultimaVisita: e.target.value }))}
            className={!form.jaVeio ? "opacity-40" : ""}
          />
        </div>
        <div className="space-y-1">
          <Label className={`block truncate ${!form.respondeu ? "text-muted-foreground" : ""}`}>Corujão confirmado</Label>
          <Input
            type="date"
            value={form.confirmouData}
            disabled={!form.respondeu}
            onChange={(e) => setForm((f) => ({ ...f, confirmouData: e.target.value }))}
            className={!form.respondeu ? "opacity-40" : ""}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

interface Props {
  initialClientes: CorujaoClienteSummary[];
  initialStats: CorujaoStats;
}

export function CorujaoClientesPanel({ initialClientes, initialStats }: Props) {
  const [clientes, setClientes] = useState<CorujaoClienteSummary[]>(initialClientes);
  const [stats, setStats] = useState<CorujaoStats>(initialStats);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    clientApi<{ clientes: CorujaoClienteSummary[] }>("/corujao/clientes?limit=200")
      .then(({ clientes }) => setClientes(clientes))
      .catch(() => {});
    clientApi<{ totalClientes: number; totalAtivos: number; totalSessoes: number; jaVieram: number }>("/corujao/stats")
      .then((r) => setStats({ totalClientes: r.totalClientes, clientesAtivos: r.totalAtivos, totalSessoes: r.totalSessoes, jaVieram: r.jaVieram }))
      .catch(() => {});
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClienteFormValues>(emptyForm());

  const [editTarget, setEditTarget] = useState<CorujaoClienteSummary | null>(null);
  const [editForm, setEditForm] = useState<ClienteFormValues>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<CorujaoClienteSummary | null>(null);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPending, setCsvPending] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ name: string; phone: string; instagram: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reloadClientes(q = search) {
    const params = new URLSearchParams({ page: "1", limit: "200" });
    if (q) params.set("q", q);
    const [{ clientes: fresh }, rawStats] = await Promise.all([
      clientApi<{ clientes: CorujaoClienteSummary[] }>(`/corujao/clientes?${params}`),
      clientApi<{ totalClientes: number; totalAtivos: number; totalSessoes: number; jaVieram: number }>("/corujao/stats")
    ]);
    setClientes(fresh);
    setStats({ totalClientes: rawStats.totalClientes, clientesAtivos: rawStats.totalAtivos, totalSessoes: rawStats.totalSessoes, jaVieram: rawStats.jaVieram });
  }

  function buildPayload(f: ClienteFormValues) {
    return {
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      instagram: f.instagram.trim().replace(/^@/, "") || null,
      active: f.active,
      respondeu: f.respondeu,
      jaVeio: f.jaVeio,
      ultimaVisita: f.jaVeio && f.ultimaVisita ? f.ultimaVisita : null,
      confirmouData: f.respondeu && f.confirmouData ? f.confirmouData : null
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (createForm.phone && !isValidPhone(createForm.phone)) { toast.error("Telefone inválido."); return; }
    setPending(true);
    try {
      await clientApi("/corujao/clientes", { method: "POST", body: JSON.stringify(buildPayload(createForm)) });
      await reloadClientes();
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success("Cliente adicionado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cliente.");
    } finally { setPending(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editForm.phone && !isValidPhone(editForm.phone)) { toast.error("Telefone inválido."); return; }
    setPending(true);
    try {
      await clientApi(`/corujao/clientes/${editTarget.id}`, { method: "PUT", body: JSON.stringify(buildPayload(editForm)) });
      await reloadClientes();
      setEditTarget(null);
      toast.success("Cliente atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally { setPending(false); }
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
    } finally { setPending(false); }
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const hasHeader = /nome|name/i.test(lines[0] ?? "");
      const parsed = (hasHeader ? lines.slice(1) : lines).map((line) => {
        const cols = line.split(/[,;|\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ""));
        return { name: cols[0] ?? "", phone: cols[1] ?? "", instagram: (cols[2] ?? "").replace(/^@/, "") };
      }).filter((r) => r.name);
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
  }

  async function handleCsvImport() {
    if (csvPreview.length === 0) return;
    setCsvPending(true);
    let ok = 0, fail = 0;
    for (const row of csvPreview) {
      try {
        await clientApi("/corujao/clientes", { method: "POST", body: JSON.stringify({ name: row.name, phone: row.phone || null, instagram: row.instagram || null }) });
        ok++;
      } catch { fail++; }
    }
    await reloadClientes();
    setCsvOpen(false);
    setCsvPreview([]);
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`${ok} cliente(s) importado(s)${fail ? `, ${fail} erro(s)` : ""}.`);
    setCsvPending(false);
  }

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.instagram ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  const naoResponderam = filtered.filter((c) => !c.respondeu);

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes do Corujão."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
              <UploadIcon className="w-4 h-4 mr-1" /> Importar CSV
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-1" /> Novo cliente
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.totalClientes}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.clientesAtivos}</p><p className="text-sm text-muted-foreground">Ativos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clientes.filter(c => c.jaVeio).length}</p><p className="text-sm text-muted-foreground">Já vieram</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clientes.filter(c => c.respondeu).length}</p><p className="text-sm text-muted-foreground">Responderam</p></CardContent></Card>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, @instagram ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Nenhum cliente" description="Adicione ou importe clientes do Corujão." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Respondeu?</TableHead>
                <TableHead>Já veio?</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Confirmou em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={!c.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium max-w-[180px] truncate">{c.name}</TableCell>
                  <TableCell className="max-w-[160px]">
                    <div className="text-sm">
                      {c.phone && <p className="text-muted-foreground truncate">{c.phone}</p>}
                      {c.instagram && <p className="text-muted-foreground truncate">@{c.instagram}</p>}
                      {!c.phone && !c.instagram && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.respondeu
                      ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Sim</Badge>
                      : <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">Não</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    {c.jaVeio
                      ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Sim</Badge>
                      : <Badge variant="secondary">Nunca</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.ultimaVisita ? formatDate(c.ultimaVisita) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.confirmouData ? formatDate(c.confirmouData) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.active
                      ? <Badge variant="outline" className="text-green-600">Ativo</Badge>
                      : <Badge variant="secondary">Inativo</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditTarget(c); setEditForm(formFromCliente(c)); }}>
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(c)}>
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

      {naoResponderam.length > 0 && !search && (
        <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
            {naoResponderam.length} ainda não respondeu:
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
            {naoResponderam.map((c) => c.name).join(", ")}
          </p>
        </div>
      )}

      {/* Dialog criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
          <ClienteForm
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            pending={pending}
            submitLabel="Criar"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          {editTarget && (
            <ClienteForm
              form={editForm}
              setForm={setEditForm}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              pending={pending}
              submitLabel="Salvar"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog deletar */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remover cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={pending} onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog CSV */}
      <Dialog open={csvOpen} onOpenChange={(o) => { if (!o) { setCsvPreview([]); if (fileRef.current) fileRef.current.value = ""; } setCsvOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar clientes via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Colunas: <strong>nome, telefone, instagram</strong> — separadas por vírgula, ponto-vírgula, pipe ou tab.
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2 font-mono">
              nome;telefone;instagram<br />
              João Silva;(11) 99999-1111;@joao<br />
              Maria Souza;;@maria
            </p>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsvFile}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-input file:text-sm file:bg-background file:cursor-pointer cursor-pointer" />
            {csvPreview.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded text-sm">
                <table className="w-full">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-1">Nome</th>
                      <th className="text-left px-3 py-1">Telefone</th>
                      <th className="text-left px-3 py-1">Instagram</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1">{r.name}</td>
                        <td className="px-3 py-1 text-muted-foreground">{r.phone || "—"}</td>
                        <td className="px-3 py-1 text-muted-foreground">{r.instagram ? `@${r.instagram}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-xs text-muted-foreground border-t">{csvPreview.length} linha(s)</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancelar</Button>
            <Button disabled={csvPreview.length === 0 || csvPending} onClick={handleCsvImport}>
              {csvPending ? "Importando..." : `Importar ${csvPreview.length > 0 ? csvPreview.length : ""} cliente(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
