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
  CheckIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  XIcon
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
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
import { clientApi } from "@/lib/api";

import {
  CorujaoProximaSessaoCard,
  type ProximaSessao
} from "./corujao-proxima-sessao-card";

type SessaoOption = {
  id: number;
  data: string;
  totalVagas: number;
  status: "planejado" | "aberto" | "lotado" | "realizado" | "cancelado";
  vagasVendidas: number;
  vagasRestantes: number;
};

const PAGE_SIZE = 50;

const ORIGEM_OPTIONS = [
  { value: "espontaneo", label: "Espontâneo" },
  { value: "anuncio", label: "Anúncio" },
  { value: "indicacao", label: "Indicação" },
  { value: "outro", label: "Outro" }
] as const;
type Origem = (typeof ORIGEM_OPTIONS)[number]["value"];

const STATUS_CONVERSA_OPTIONS = [
  { value: "sem_resposta", label: "Sem resposta", tone: "muted" },
  { value: "aguardando", label: "Aguardando", tone: "amber" },
  { value: "confirmou", label: "Confirmou", tone: "emerald" },
  { value: "recusou", label: "Recusou", tone: "red" }
] as const;
type StatusConversa = (typeof STATUS_CONVERSA_OPTIONS)[number]["value"];

const STATUS_PAGAMENTO_OPTIONS = [
  { value: "pendente", label: "Pendente", tone: "muted" },
  { value: "confirmou_pagou", label: "Confirmou e pagou", tone: "emerald" },
  { value: "confirmou_nao_pagou", label: "Confirmou, não pagou", tone: "amber" },
  { value: "paga_na_hora", label: "Paga na hora", tone: "blue" }
] as const;
type StatusPagamento = (typeof STATUS_PAGAMENTO_OPTIONS)[number]["value"];

const FORMA_PAGAMENTO_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "gateway", label: "Gateway (Asaas/Abacate)" },
  { value: "cortesia", label: "Cortesia" },
  { value: "outro", label: "Outro" }
] as const;
type FormaPagamento = (typeof FORMA_PAGAMENTO_OPTIONS)[number]["value"];

type VisitaResumida = {
  id: number;
  contatoId: number;
  sessaoId: number | null;
  dataVisita: string;
  amountCents: number;
  formaPagamento: FormaPagamento;
  observacoes: string | null;
  createdAt: string;
};

type VisitaForm = {
  sessaoId: string; // "" = sem sessão. Manter como string facilita o <select>.
  dataVisita: string;
  valorInput: string; // "45,00" — mantém o que o usuário digitou
  formaPagamento: FormaPagamento;
  observacoes: string;
};

function emptyVisitaForm(defaultSessaoId: string = ""): VisitaForm {
  return {
    sessaoId: defaultSessaoId,
    dataVisita: new Date().toISOString().slice(0, 10),
    valorInput: "",
    formaPagamento: "pix",
    observacoes: ""
  };
}

function formatSessaoOptionLabel(s: SessaoOption): string {
  // "2026-05-28" → "28/05"; default sem fuso.
  const d = new Date(`${s.data}T00:00:00`);
  const dataFmt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dataFmt} · ${s.vagasVendidas}/${s.totalVagas}`;
}

// "45,00" → 4500. "45" → 4500. "45,5" → 4550. "" + cortesia tratado fora.
// Decimais > 2 são truncados pra evitar centavo de menos por arredondamento.
function parseValorToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const reais = Number(normalized);
  if (!Number.isFinite(reais) || reais < 0) return null;
  return Math.round(reais * 100);
}

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
  ultimoContatoEm: string | null;
  statusConversa: StatusConversa | null;
  statusPagamento: StatusPagamento | null;
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
  statusConversa: StatusConversa | "";
  statusPagamento: StatusPagamento | "";
};

type PatchPayload = {
  nome?: string | null;
  telefone?: string;
  email?: string | null;
  dataNascimento?: string | null;
  origem?: Origem;
  observacoes?: string | null;
  statusConversa?: StatusConversa | null;
  statusPagamento?: StatusPagamento | null;
};

function emptyForm(): FormValues {
  return {
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
    origem: "espontaneo",
    observacoes: "",
    statusConversa: "",
    statusPagamento: ""
  };
}

// Erros lançados por clientApi/parseApiResponse trazem `error.message` com mensagem do backend.
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

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
    observacoes: c.observacoes ?? "",
    statusConversa: c.statusConversa ?? "",
    statusPagamento: c.statusPagamento ?? ""
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatRelativeContact(iso: string | null): string {
  if (!iso) return "Nunca";
  const now = Date.now();
  const past = new Date(iso).getTime();
  const diffMs = now - past;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  return formatDate(iso);
}

// "(11) 99999-9999" → "5511999999999". Se já tem DDI 55, mantém.
function normalizePhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function toneClass(tone: string): string {
  switch (tone) {
    case "amber":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "emerald":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "red":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "blue":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "muted":
    default:
      return "bg-muted text-muted-foreground border-border/40";
  }
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-3xl" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex gap-6 border-b border-border/40 px-4 py-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CorujaoTrabalhoTabela() {
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
  const [filterConversa, setFilterConversa] = useState<StatusConversa | "">("");
  const [filterPagamento, setFilterPagamento] = useState<StatusPagamento | "">("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const [visitaDialogOpen, setVisitaDialogOpen] = useState(false);
  const [visitaTarget, setVisitaTarget] = useState<Contato | null>(null);
  const [visitaForm, setVisitaForm] = useState<VisitaForm>(emptyVisitaForm());
  const [visitaSubmitting, setVisitaSubmitting] = useState(false);

  const [proximaSessao, setProximaSessao] = useState<ProximaSessao | null>(null);
  const [proximaLoading, setProximaLoading] = useState(true);
  const [sessoesFuturas, setSessoesFuturas] = useState<SessaoOption[]>([]);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Contato | null>(null);
  const [cancelVisitas, setCancelVisitas] = useState<VisitaResumida[]>([]);
  const [cancelBusy, setCancelBusy] = useState<number | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(value), 400);
  }

  async function reload() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE)
    });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (filterConversa) params.set("statusConversa", filterConversa);
    if (filterPagamento) params.set("statusPagamento", filterPagamento);
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
  }, [page, debouncedQuery, filterConversa, filterPagamento]);

  async function reloadProximaSessao() {
    setProximaLoading(true);
    try {
      const [proxRes, futRes] = await Promise.all([
        clientApi<{ sessao: ProximaSessao | null }>(`/corujao/sessoes/proxima`),
        clientApi<{ sessoes: SessaoOption[] }>(`/corujao/sessoes?futuras=true`)
      ]);
      setProximaSessao(proxRes.sessao);
      // Só sessões abertas/planejadas/lotadas servem pra registrar visita.
      setSessoesFuturas(
        futRes.sessoes.filter((s) =>
          ["planejado", "aberto", "lotado"].includes(s.status)
        )
      );
    } catch {
      // silencioso — o card mostra "Nenhuma sessão" e o select fica vazio.
      setProximaSessao(null);
      setSessoesFuturas([]);
    } finally {
      setProximaLoading(false);
    }
  }

  useEffect(() => {
    reloadProximaSessao();
  }, []);

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

        const formConversa = (form.statusConversa || null) as StatusConversa | null;
        if (formConversa !== editing.statusConversa) diff.statusConversa = formConversa;
        const formPagamento = (form.statusPagamento || null) as StatusPagamento | null;
        if (formPagamento !== editing.statusPagamento) diff.statusPagamento = formPagamento;

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
            observacoes: form.observacoes.trim() || null,
            statusConversa: form.statusConversa || null,
            statusPagamento: form.statusPagamento || null
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

  async function updateContactField(id: number, payload: PatchPayload, successMsg?: string) {
    setRowBusy(id);
    try {
      const res = await clientApi<{ contato: Contato }>(`/corujao/contatos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setContatos((cur) => cur.map((c) => (c.id === id ? res.contato : c)));
      if (successMsg) toast.success(successMsg);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao atualizar."));
    } finally {
      setRowBusy(null);
    }
  }

  async function handleChamar(contato: Contato) {
    if (!contato.telefone) {
      toast.error("Contato sem telefone — cadastre o número antes de chamar.");
      return;
    }
    const normalized = normalizePhoneForWhatsApp(contato.telefone);
    if (!normalized) {
      toast.error("Telefone inválido para WhatsApp.");
      return;
    }
    // window.open precisa ser SÍNCRONO no handler do click pra escapar do popup blocker.
    window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");

    setRowBusy(contato.id);
    try {
      const res = await clientApi<{ contato: Contato }>(
        `/corujao/contatos/${contato.id}/marcar-contato`,
        { method: "POST" }
      );
      setContatos((cur) => cur.map((c) => (c.id === contato.id ? res.contato : c)));
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          "Não foi possível registrar o contato no servidor — WhatsApp já abriu."
        )
      );
    } finally {
      setRowBusy(null);
    }
  }

  function openVisitaDialog(contato: Contato) {
    setVisitaTarget(contato);
    // Default = próxima sessão futura (se houver), pra acelerar o caso comum.
    const defaultSessao = proximaSessao ? String(proximaSessao.id) : "";
    setVisitaForm(emptyVisitaForm(defaultSessao));
    setVisitaDialogOpen(true);
  }

  function closeVisitaDialog() {
    if (visitaSubmitting) return;
    setVisitaDialogOpen(false);
    setVisitaTarget(null);
    setVisitaForm(emptyVisitaForm());
  }

  async function handleVisitaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (visitaSubmitting || !visitaTarget) return;

    // Cortesia aceita campo vazio (= 0). Outras formas exigem valor.
    let amountCents: number;
    if (visitaForm.formaPagamento === "cortesia" && visitaForm.valorInput.trim() === "") {
      amountCents = 0;
    } else {
      const parsed = parseValorToCents(visitaForm.valorInput);
      if (parsed === null) {
        toast.error("Valor inválido. Use formato 45,00 (ou deixe em branco quando for cortesia).");
        return;
      }
      amountCents = parsed;
    }

    if (amountCents === 0 && visitaForm.formaPagamento !== "cortesia") {
      toast.error("Valor 0 só é permitido quando a forma de pagamento é Cortesia.");
      return;
    }

    setVisitaSubmitting(true);
    try {
      const sessaoIdNum = visitaForm.sessaoId ? Number(visitaForm.sessaoId) : null;
      const res = await clientApi<{ visita: unknown; contato: Contato }>(
        `/corujao/visitas`,
        {
          method: "POST",
          body: JSON.stringify({
            contatoId: visitaTarget.id,
            sessaoId: sessaoIdNum,
            dataVisita: visitaForm.dataVisita,
            amountCents,
            formaPagamento: visitaForm.formaPagamento,
            observacoes: visitaForm.observacoes.trim() || null
          })
        }
      );
      // Atualiza só a linha local — ja_participou vem true do backend.
      setContatos((cur) => cur.map((c) => (c.id === res.contato.id ? res.contato : c)));
      // Decrementa vagas localmente quando a visita amarrou na próxima sessão.
      if (sessaoIdNum !== null && proximaSessao && proximaSessao.id === sessaoIdNum) {
        const vendidas = proximaSessao.vagasVendidas + 1;
        setProximaSessao({
          ...proximaSessao,
          vagasVendidas: vendidas,
          vagasRestantes: Math.max(0, proximaSessao.totalVagas - vendidas)
        });
      }
      toast.success("Visita registrada. Contato marcado como participou.");
      setVisitaDialogOpen(false);
      setVisitaTarget(null);
      setVisitaForm(emptyVisitaForm());
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao registrar visita."));
    } finally {
      setVisitaSubmitting(false);
    }
  }

  // Sempre abre o Dialog — com 1 visita aparece a linha sozinha + botão
  // de confirmação, com 2+ aparece a lista. Mantém estética consistente
  // com o resto do painel (sem confirm() nativo).
  async function startCancelarVisita(contato: Contato) {
    setRowBusy(contato.id);
    try {
      const { visitas } = await clientApi<{ visitas: VisitaResumida[] }>(
        `/corujao/contatos/${contato.id}/visitas`
      );
      if (visitas.length === 0) {
        // Estado inconsistente: jaParticipou=true mas sem visitas. Limpa.
        toast.info("Não há visitas registradas — atualizando contato.");
        await reload();
        return;
      }
      setCancelTarget(contato);
      setCancelVisitas(visitas);
      setCancelDialogOpen(true);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao buscar visitas do contato."));
    } finally {
      setRowBusy(null);
    }
  }

  async function executarCancel(visitaId: number, sessaoId: number | null) {
    setCancelBusy(visitaId);
    try {
      const res = await clientApi<{ contato: Contato | null; sessaoId: number | null }>(
        `/corujao/visitas/${visitaId}`,
        { method: "DELETE" }
      );
      if (res.contato) {
        setContatos((cur) => cur.map((c) => (c.id === res.contato!.id ? res.contato! : c)));
      }
      // Decrementa o card só se a visita removida era da próxima sessão.
      if (sessaoId !== null && proximaSessao && proximaSessao.id === sessaoId) {
        const vendidas = Math.max(0, proximaSessao.vagasVendidas - 1);
        setProximaSessao({
          ...proximaSessao,
          vagasVendidas: vendidas,
          vagasRestantes: Math.max(0, proximaSessao.totalVagas - vendidas)
        });
      }
      toast.success("Visita cancelada. Vaga liberada.");
      // Atualiza o Dialog (se estava aberto) removendo a visita cancelada
      // ou fechando se foi a última.
      setCancelVisitas((cur) => {
        const next = cur.filter((v) => v.id !== visitaId);
        if (next.length === 0) {
          setCancelDialogOpen(false);
          setCancelTarget(null);
        }
        return next;
      });
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao cancelar visita."));
    } finally {
      setCancelBusy(null);
    }
  }

  function closeCancelDialog() {
    if (cancelBusy !== null) return;
    setCancelDialogOpen(false);
    setCancelTarget(null);
    setCancelVisitas([]);
  }

  if (loading && contatos.length === 0) return <ListSkeleton />;

  const showingFiltered = !!(query || filterConversa || filterPagamento);

  return (
    <div className="flex flex-col gap-6">
      <CorujaoProximaSessaoCard sessao={proximaSessao} loading={proximaLoading} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nome, telefone ou email…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-72 text-sm"
          />
          <select
            value={filterConversa}
            onChange={(e) => {
              setFilterConversa(e.target.value as StatusConversa | "");
              setPage(1);
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos os status (conversa)</option>
            {STATUS_CONVERSA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={filterPagamento}
            onChange={(e) => {
              setFilterPagamento(e.target.value as StatusPagamento | "");
              setPage(1);
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos os status (pagamento)</option>
            {STATUS_PAGAMENTO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {showingFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                setFilterConversa("");
                setFilterPagamento("");
                setPage(1);
              }}
              className="gap-1.5"
            >
              <XIcon className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo contato
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        {!loading && contatos.length === 0 ? (
          <EmptyState
            icon={showingFiltered ? UsersIcon : MoonIcon}
            title={showingFiltered ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
            description={
              showingFiltered
                ? "Tente outros termos ou limpe os filtros."
                : "Comece cadastrando o primeiro contato do Corujão."
            }
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Conversa</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Últ. contato</TableHead>
                <TableHead className="max-w-[180px]">Observações</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : contatos.map((contato) => {
                    const conversaOpt = STATUS_CONVERSA_OPTIONS.find(
                      (o) => o.value === contato.statusConversa
                    );
                    const pagamentoOpt = STATUS_PAGAMENTO_OPTIONS.find(
                      (o) => o.value === contato.statusPagamento
                    );
                    const busy = rowBusy === contato.id;
                    return (
                      <TableRow key={contato.id}>
                        <TableCell className="font-medium">
                          {contato.nome ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {contato.telefone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 -mx-2 px-2 font-normal"
                                disabled={busy}
                              >
                                <Badge
                                  variant="outline"
                                  className={`font-normal ${toneClass(conversaOpt?.tone ?? "muted")}`}
                                >
                                  {conversaOpt?.label ?? "—"}
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {STATUS_CONVERSA_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.value}
                                  onClick={() =>
                                    updateContactField(
                                      contato.id,
                                      { statusConversa: opt.value },
                                      "Status atualizado."
                                    )
                                  }
                                >
                                  {opt.label}
                                </DropdownMenuItem>
                              ))}
                              {contato.statusConversa && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateContactField(
                                      contato.id,
                                      { statusConversa: null },
                                      "Status limpo."
                                    )
                                  }
                                  className="text-muted-foreground"
                                >
                                  Limpar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 -mx-2 px-2 font-normal"
                                disabled={busy}
                              >
                                <Badge
                                  variant="outline"
                                  className={`font-normal ${toneClass(pagamentoOpt?.tone ?? "muted")}`}
                                >
                                  {pagamentoOpt?.label ?? "—"}
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {STATUS_PAGAMENTO_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.value}
                                  onClick={() =>
                                    updateContactField(
                                      contato.id,
                                      { statusPagamento: opt.value },
                                      "Status atualizado."
                                    )
                                  }
                                >
                                  {opt.label}
                                </DropdownMenuItem>
                              ))}
                              {contato.statusPagamento && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateContactField(
                                      contato.id,
                                      { statusPagamento: null },
                                      "Status limpo."
                                    )
                                  }
                                  className="text-muted-foreground"
                                >
                                  Limpar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelativeContact(contato.ultimoContatoEm)}
                        </TableCell>
                        <TableCell
                          className="max-w-[180px] truncate text-sm text-muted-foreground"
                          title={contato.observacoes ?? ""}
                        >
                          {contato.observacoes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 gap-1.5"
                              onClick={() => handleChamar(contato)}
                              disabled={busy}
                            >
                              <PhoneIcon className="h-3.5 w-3.5" />
                              Chamar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openVisitaDialog(contato)}>
                                  <CheckIcon className="mr-2 h-4 w-4" />
                                  Registrar visita
                                </DropdownMenuItem>
                                {contato.jaParticipou && (
                                  <DropdownMenuItem
                                    onClick={() => startCancelarVisita(contato)}
                                    className="text-red-400 focus:text-red-400"
                                  >
                                    <Trash2Icon className="mr-2 h-4 w-4" />
                                    Cancelar visita
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openEdit(contato)}>
                                  <PencilIcon className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination.pages > 1 && (
        <Pagination page={page} pageCount={pagination.pages} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contato-origem">Origem</Label>
                <select
                  id="contato-origem"
                  value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value as Origem }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ORIGEM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contato-status-conversa">Status conversa</Label>
                <select
                  id="contato-status-conversa"
                  value={form.statusConversa}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      statusConversa: e.target.value as StatusConversa | ""
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— (nenhum)</option>
                  {STATUS_CONVERSA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contato-status-pagamento">Status pagamento</Label>
              <select
                id="contato-status-pagamento"
                value={form.statusPagamento}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    statusPagamento: e.target.value as StatusPagamento | ""
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— (nenhum)</option>
                {STATUS_PAGAMENTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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

      <Dialog
        open={visitaDialogOpen}
        onOpenChange={(open) => (open ? setVisitaDialogOpen(true) : closeVisitaDialog())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Registrar visita
              {visitaTarget ? (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {visitaTarget.nome ?? visitaTarget.telefone ?? `Contato #${visitaTarget.id}`}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVisitaSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="visita-sessao">Sessão do Corujão</Label>
              <select
                id="visita-sessao"
                value={visitaForm.sessaoId}
                onChange={(e) =>
                  setVisitaForm((f) => ({ ...f, sessaoId: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {sessoesFuturas.length === 0 ? (
                  <option value="">— sem sessão (avulsa)</option>
                ) : (
                  <>
                    {sessoesFuturas.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {formatSessaoOptionLabel(s)}
                      </option>
                    ))}
                    <option value="">— sem sessão (avulsa)</option>
                  </>
                )}
              </select>
              {sessoesFuturas.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma sessão futura cadastrada — visita vai ficar como avulsa.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="visita-data">Data da visita</Label>
                <Input
                  id="visita-data"
                  type="date"
                  value={visitaForm.dataVisita}
                  onChange={(e) =>
                    setVisitaForm((f) => ({ ...f, dataVisita: e.target.value }))
                  }
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visita-valor">
                  Valor R$
                  {visitaForm.formaPagamento === "cortesia" ? (
                    <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
                  ) : null}
                </Label>
                <Input
                  id="visita-valor"
                  inputMode="decimal"
                  placeholder="45,00"
                  value={visitaForm.valorInput}
                  onChange={(e) =>
                    setVisitaForm((f) => ({ ...f, valorInput: e.target.value }))
                  }
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visita-forma">Forma de pagamento</Label>
              <select
                id="visita-forma"
                value={visitaForm.formaPagamento}
                onChange={(e) =>
                  setVisitaForm((f) => ({
                    ...f,
                    formaPagamento: e.target.value as FormaPagamento
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FORMA_PAGAMENTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visita-obs">Observações</Label>
              <Textarea
                id="visita-obs"
                value={visitaForm.observacoes}
                onChange={(e) =>
                  setVisitaForm((f) => ({ ...f, observacoes: e.target.value }))
                }
                placeholder="Veio acompanhado, comentário, etc."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeVisitaDialog}
                disabled={visitaSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={visitaSubmitting}>
                {visitaSubmitting ? "Registrando…" : "Registrar visita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => (open ? setCancelDialogOpen(true) : closeCancelDialog())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cancelar visita
              {cancelTarget ? (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {cancelVisitas.length === 1
                    ? `${cancelTarget.nome ?? cancelTarget.telefone ?? `Contato #${cancelTarget.id}`} — confirme abaixo.`
                    : `${cancelTarget.nome ?? cancelTarget.telefone ?? `Contato #${cancelTarget.id}`} tem ${cancelVisitas.length} visitas — escolha qual cancelar.`}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {cancelVisitas.map((v) => {
              const valorFmt = (v.amountCents / 100).toFixed(2).replace(".", ",");
              const dataFmt = new Date(`${v.dataVisita}T00:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              });
              const busy = cancelBusy === v.id;
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
                >
                  <div className="text-sm">
                    <div className="font-medium tabular-nums">
                      {dataFmt} · R$ {valorFmt} · {v.formaPagamento}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {v.sessaoId ? `Sessão #${v.sessaoId}` : "Visita avulsa"}
                      {v.observacoes ? ` · ${v.observacoes}` : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                    disabled={busy}
                    onClick={() => executarCancel(v.id, v.sessaoId)}
                  >
                    <Trash2Icon className="mr-1.5 h-4 w-4" />
                    {busy ? "Cancelando…" : "Cancelar esta"}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeCancelDialog}
              disabled={cancelBusy !== null}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
