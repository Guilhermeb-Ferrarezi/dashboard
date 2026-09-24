"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import FullCalendar from "@fullcalendar/react";
import type {
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, Trash2Icon, PencilIcon } from "@/components/ui/icons";
import { clientApi } from "@/lib/api";

import "./fullcalendar-onix.css";

const DIAS_SEMANA = [
  { value: "domingo", label: "Dom" },
  { value: "segunda", label: "Seg" },
  { value: "terca", label: "Ter" },
  { value: "quarta", label: "Qua" },
  { value: "quinta", label: "Qui" },
  { value: "sexta", label: "Sex" },
  { value: "sabado", label: "Sáb" },
] as const;
type DiaSemana = (typeof DIAS_SEMANA)[number]["value"];

const PALETA_PROFESSOR = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function corDoProfessor(professor: string): string {
  let hash = 0;
  for (let i = 0; i < professor.length; i++) hash = (hash * 31 + professor.charCodeAt(i)) >>> 0;
  return PALETA_PROFESSOR[hash % PALETA_PROFESSOR.length]!;
}

function dataParaYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function dataParaHM(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

type Recorrente = {
  id: string;
  titulo: string;
  professor: string;
  turmaDescricao: string;
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
  conteudo: string[];
  ativo: boolean;
  dataInicio: string;
  dataFim: string | null;
  observacoes: string;
};

type Avulsa = {
  id: string;
  titulo: string;
  professor: string;
  turmaDescricao: string;
  conteudo: string[];
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  status: "agendada" | "realizada" | "cancelada";
  observacoes: string;
};

type Evento = {
  id: string;
  origem: "recorrente" | "avulsa";
  recorrenteId: string | null;
  avulsaId: string | null;
  excecaoId: string | null;
  titulo: string;
  professor: string;
  turmaDescricao: string;
  conteudo: string[];
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  cancelada: boolean;
  reagendadaDe: string | null;
};

type RecorrenteForm = {
  titulo: string;
  professor: string;
  turmaDescricao: string;
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
  conteudo: string;
  dataInicio: string;
  dataFim: string;
  observacoes: string;
  ativo: boolean;
};

function emptyRecorrenteForm(): RecorrenteForm {
  return {
    titulo: "",
    professor: "",
    turmaDescricao: "",
    diasSemana: [],
    horarioInicio: "",
    horarioFim: "",
    conteudo: "",
    dataInicio: dataParaYMD(new Date()),
    dataFim: "",
    observacoes: "",
    ativo: true,
  };
}

function formFromRecorrente(r: Recorrente): RecorrenteForm {
  return {
    titulo: r.titulo,
    professor: r.professor,
    turmaDescricao: r.turmaDescricao,
    diasSemana: r.diasSemana,
    horarioInicio: r.horarioInicio,
    horarioFim: r.horarioFim,
    conteudo: r.conteudo.join(", "),
    dataInicio: r.dataInicio,
    dataFim: r.dataFim ?? "",
    observacoes: r.observacoes,
    ativo: r.ativo,
  };
}

type AvulsaForm = {
  titulo: string;
  professor: string;
  turmaDescricao: string;
  conteudo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  status: Avulsa["status"];
  observacoes: string;
};

function emptyAvulsaForm(dataInicial?: string): AvulsaForm {
  return {
    titulo: "",
    professor: "",
    turmaDescricao: "",
    conteudo: "",
    data: dataInicial ?? dataParaYMD(new Date()),
    horarioInicio: "",
    horarioFim: "",
    status: "agendada",
    observacoes: "",
  };
}

function formFromAvulsa(a: Avulsa): AvulsaForm {
  return {
    titulo: a.titulo,
    professor: a.professor,
    turmaDescricao: a.turmaDescricao,
    conteudo: a.conteudo.join(", "),
    data: a.data,
    horarioInicio: a.horarioInicio,
    horarioFim: a.horarioFim ?? "",
    status: a.status,
    observacoes: a.observacoes,
  };
}

function parseConteudoInput(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function formatDataLong(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "short" });
}

const STATUS_AVULSA_OPTIONS = [
  { value: "agendada", label: "Agendada" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export function AulasCalendario() {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [recorrentes, setRecorrentes] = useState<Recorrente[]>([]);
  const [avulsas, setAvulsas] = useState<Avulsa[]>([]);
  const [loading, setLoading] = useState(true);

  const [detalheEvento, setDetalheEvento] = useState<Evento | null>(null);
  const [movendo, setMovendo] = useState(false);
  const [novaDataMover, setNovaDataMover] = useState("");
  const [novoInicioMover, setNovoInicioMover] = useState("");
  const [novoFimMover, setNovoFimMover] = useState("");

  const [dialogRecorrente, setDialogRecorrente] = useState<{ editing: Recorrente | null } | null>(null);
  const [formRecorrente, setFormRecorrente] = useState<RecorrenteForm>(emptyRecorrenteForm());
  const [salvandoRecorrente, setSalvandoRecorrente] = useState(false);

  const [dialogAvulsa, setDialogAvulsa] = useState<{ editing: Avulsa | null } | null>(null);
  const [formAvulsa, setFormAvulsa] = useState<AvulsaForm>(emptyAvulsaForm());
  const [salvandoAvulsa, setSalvandoAvulsa] = useState(false);

  const carregarListasBase = useCallback(async () => {
    try {
      const [resRecorrentes, resAvulsas] = await Promise.all([
        clientApi<{ recorrentes: Recorrente[] }>("/aulas/recorrentes"),
        clientApi<{ avulsas: Avulsa[] }>("/aulas/avulsas"),
      ]);
      setRecorrentes(resRecorrentes.recorrentes);
      setAvulsas(resAvulsas.avulsas);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar turmas e aulas avulsas."));
    }
  }, []);

  const carregarEventos = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await clientApi<{ eventos: Evento[] }>(
        `/aulas/eventos?from=${from}&to=${to}`,
      );
      setEventos(res.eventos);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao carregar eventos do calendário."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarListasBase();
  }, [carregarListasBase]);

  useEffect(() => {
    if (range) carregarEventos(range.from, range.to);
  }, [range, carregarEventos]);

  function handleDatesSet(arg: DatesSetArg) {
    const from = dataParaYMD(arg.start);
    const fimInclusive = new Date(arg.end);
    fimInclusive.setDate(fimInclusive.getDate() - 1);
    const to = dataParaYMD(fimInclusive);
    setRange((cur) => (cur?.from === from && cur?.to === to ? cur : { from, to }));
  }

  const eventInputs = useMemo<EventInput[]>(
    () =>
      eventos.map((evento) => ({
        id: evento.id,
        title: evento.titulo,
        start: `${evento.data}T${evento.horarioInicio}:00`,
        end: evento.horarioFim ? `${evento.data}T${evento.horarioFim}:00` : undefined,
        backgroundColor: corDoProfessor(evento.professor),
        borderColor: corDoProfessor(evento.professor),
        classNames: evento.cancelada ? ["aula-cancelada"] : [],
        extendedProps: { evento },
      })),
    [eventos],
  );

  function handleEventClick(arg: EventClickArg) {
    const evento = (arg.event.extendedProps as { evento: Evento }).evento;
    setDetalheEvento(evento);
    setMovendo(false);
  }

  async function salvarExcecaoReagendada(
    evento: Evento,
    novaData: string,
    novoInicio: string,
    novoFim: string | null,
  ) {
    if (!evento.recorrenteId) return;
    const dataOriginal = evento.reagendadaDe ?? evento.data;
    try {
      await clientApi(`/aulas/recorrentes/${evento.recorrenteId}/excecoes`, {
        method: "POST",
        body: JSON.stringify({
          data: dataOriginal,
          tipo: "reagendada",
          novaData: novaData !== dataOriginal ? novaData : null,
          novoHorarioInicio: novoInicio,
          novoHorarioFim: novoFim,
        }),
      });
      toast.success("Ocorrência reagendada.");
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao reagendar ocorrência."));
      if (range) carregarEventos(range.from, range.to);
    }
  }

  async function handleEventDrop(arg: EventDropArg) {
    const evento = (arg.event.extendedProps as { evento: Evento }).evento;
    const novaData = dataParaYMD(arg.event.start!);
    const novoInicio = dataParaHM(arg.event.start!);
    const novoFim = arg.event.end ? dataParaHM(arg.event.end) : null;

    if (evento.origem === "avulsa" && evento.avulsaId) {
      try {
        await clientApi(`/aulas/avulsas/${evento.avulsaId}`, {
          method: "PATCH",
          body: JSON.stringify({ data: novaData, horarioInicio: novoInicio, horarioFim: novoFim }),
        });
        toast.success("Aula avulsa movida.");
        if (range) carregarEventos(range.from, range.to);
      } catch (error) {
        toast.error(extractErrorMessage(error, "Erro ao mover aula avulsa."));
        arg.revert();
      }
      return;
    }

    await salvarExcecaoReagendada(evento, novaData, novoInicio, novoFim);
  }

  async function handleEventResize(arg: EventResizeDoneArg) {
    const evento = (arg.event.extendedProps as { evento: Evento }).evento;
    const novaData = dataParaYMD(arg.event.start!);
    const novoInicio = dataParaHM(arg.event.start!);
    const novoFim = arg.event.end ? dataParaHM(arg.event.end) : null;

    if (evento.origem === "avulsa" && evento.avulsaId) {
      try {
        await clientApi(`/aulas/avulsas/${evento.avulsaId}`, {
          method: "PATCH",
          body: JSON.stringify({ horarioInicio: novoInicio, horarioFim: novoFim }),
        });
        toast.success("Horário atualizado.");
        if (range) carregarEventos(range.from, range.to);
      } catch (error) {
        toast.error(extractErrorMessage(error, "Erro ao atualizar horário."));
        arg.revert();
      }
      return;
    }

    await salvarExcecaoReagendada(evento, novaData, novoInicio, novoFim);
  }

  async function cancelarOcorrencia(evento: Evento) {
    if (!evento.recorrenteId) return;
    const dataOriginal = evento.reagendadaDe ?? evento.data;
    try {
      await clientApi(`/aulas/recorrentes/${evento.recorrenteId}/excecoes`, {
        method: "POST",
        body: JSON.stringify({ data: dataOriginal, tipo: "cancelada" }),
      });
      toast.success("Ocorrência cancelada.");
      setDetalheEvento(null);
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao cancelar ocorrência."));
    }
  }

  async function reativarOcorrencia(evento: Evento) {
    if (!evento.excecaoId) return;
    try {
      await clientApi(`/aulas/excecoes/${evento.excecaoId}`, { method: "DELETE" });
      toast.success("Ocorrência reativada.");
      setDetalheEvento(null);
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao reativar ocorrência."));
    }
  }

  function abrirNovaTurma() {
    setFormRecorrente(emptyRecorrenteForm());
    setDialogRecorrente({ editing: null });
  }

  function abrirEditarTurma(recorrenteId: string) {
    const recorrente = recorrentes.find((r) => r.id === recorrenteId);
    if (!recorrente) {
      toast.error("Turma não encontrada.");
      return;
    }
    setFormRecorrente(formFromRecorrente(recorrente));
    setDialogRecorrente({ editing: recorrente });
    setDetalheEvento(null);
  }

  function abrirNovaAvulsa() {
    setFormAvulsa(emptyAvulsaForm(detalheEvento?.data));
    setDialogAvulsa({ editing: null });
  }

  function abrirEditarAvulsa(avulsaId: string) {
    const avulsa = avulsas.find((a) => a.id === avulsaId);
    if (!avulsa) {
      toast.error("Aula avulsa não encontrada.");
      return;
    }
    setFormAvulsa(formFromAvulsa(avulsa));
    setDialogAvulsa({ editing: avulsa });
    setDetalheEvento(null);
  }

  function toggleDiaSemana(dia: DiaSemana) {
    setFormRecorrente((f) => ({
      ...f,
      diasSemana: f.diasSemana.includes(dia)
        ? f.diasSemana.filter((d) => d !== dia)
        : [...f.diasSemana, dia],
    }));
  }

  async function submitRecorrente(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoRecorrente) return;
    if (formRecorrente.diasSemana.length === 0) {
      toast.error("Selecione ao menos um dia da semana.");
      return;
    }

    setSalvandoRecorrente(true);
    try {
      const payload = {
        titulo: formRecorrente.titulo.trim(),
        professor: formRecorrente.professor.trim(),
        turmaDescricao: formRecorrente.turmaDescricao.trim(),
        diasSemana: formRecorrente.diasSemana,
        horarioInicio: formRecorrente.horarioInicio,
        horarioFim: formRecorrente.horarioFim,
        conteudo: parseConteudoInput(formRecorrente.conteudo),
        dataInicio: formRecorrente.dataInicio,
        dataFim: formRecorrente.dataFim || null,
        observacoes: formRecorrente.observacoes.trim(),
        ativo: formRecorrente.ativo,
      };

      if (dialogRecorrente?.editing) {
        await clientApi(`/aulas/recorrentes/${dialogRecorrente.editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Turma atualizada.");
      } else {
        await clientApi("/aulas/recorrentes", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Turma criada.");
      }

      setDialogRecorrente(null);
      await carregarListasBase();
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao salvar turma."));
    } finally {
      setSalvandoRecorrente(false);
    }
  }

  async function excluirRecorrente(id: string) {
    if (!confirm("Apagar esta turma recorrente e todas as exceções dela? Ação irreversível.")) return;
    try {
      await clientApi(`/aulas/recorrentes/${id}`, { method: "DELETE" });
      toast.success("Turma apagada.");
      setDialogRecorrente(null);
      await carregarListasBase();
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao apagar turma."));
    }
  }

  async function submitAvulsa(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoAvulsa) return;

    setSalvandoAvulsa(true);
    try {
      const payload = {
        titulo: formAvulsa.titulo.trim(),
        professor: formAvulsa.professor.trim(),
        turmaDescricao: formAvulsa.turmaDescricao.trim(),
        conteudo: parseConteudoInput(formAvulsa.conteudo),
        data: formAvulsa.data,
        horarioInicio: formAvulsa.horarioInicio,
        horarioFim: formAvulsa.horarioFim || null,
        status: formAvulsa.status,
        observacoes: formAvulsa.observacoes.trim(),
      };

      if (dialogAvulsa?.editing) {
        await clientApi(`/aulas/avulsas/${dialogAvulsa.editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Aula avulsa atualizada.");
      } else {
        await clientApi("/aulas/avulsas", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Aula avulsa criada.");
      }

      setDialogAvulsa(null);
      await carregarListasBase();
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao salvar aula avulsa."));
    } finally {
      setSalvandoAvulsa(false);
    }
  }

  async function excluirAvulsa(id: string) {
    if (!confirm("Apagar esta aula avulsa? Ação irreversível.")) return;
    try {
      await clientApi(`/aulas/avulsas/${id}`, { method: "DELETE" });
      toast.success("Aula avulsa apagada.");
      setDialogAvulsa(null);
      await carregarListasBase();
      if (range) carregarEventos(range.from, range.to);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Erro ao apagar aula avulsa."));
    }
  }

  function iniciarMover(evento: Evento) {
    setMovendo(true);
    setNovaDataMover(evento.data);
    setNovoInicioMover(evento.horarioInicio);
    setNovoFimMover(evento.horarioFim ?? "");
  }

  async function confirmarMover(evento: Evento) {
    await salvarExcecaoReagendada(evento, novaDataMover, novoInicioMover, novoFimMover || null);
    setDetalheEvento(null);
    setMovendo(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[var(--card-gap)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {loading ? "Carregando…" : `${eventos.length} aula(s) no período visível.`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={abrirNovaAvulsa} className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Aula avulsa
          </Button>
          <Button size="sm" onClick={abrirNovaTurma} className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Turma recorrente
          </Button>
        </div>
      </div>

      <div className="aulas-calendario min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 p-2">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          locale="pt-br"
          firstDay={1}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          nowIndicator
          editable
          eventStartEditable
          eventDurationEditable
          events={eventInputs}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", list: "Lista" }}
        />
      </div>

      {/* Detalhe da ocorrência clicada */}
      <Dialog open={!!detalheEvento} onOpenChange={(open) => !open && setDetalheEvento(null)}>
        <DialogContent>
          {detalheEvento ? (
            <>
              <DialogHeader>
                <DialogTitle>{detalheEvento.titulo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="blue">{detalheEvento.professor}</StatusBadge>
                  {detalheEvento.origem === "recorrente" ? (
                    <StatusBadge tone="muted">Turma recorrente</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Aula avulsa</StatusBadge>
                  )}
                  {detalheEvento.cancelada && <StatusBadge tone="red">Cancelada</StatusBadge>}
                  {detalheEvento.reagendadaDe && (
                    <StatusBadge tone="amber">
                      Reagendada de {formatDataLong(detalheEvento.reagendadaDe)}
                    </StatusBadge>
                  )}
                </div>
                <p className="capitalize text-foreground">
                  {formatDataLong(detalheEvento.data)} · {detalheEvento.horarioInicio}
                  {detalheEvento.horarioFim ? `–${detalheEvento.horarioFim}` : ""}
                </p>
                {detalheEvento.turmaDescricao && (
                  <p className="text-muted-foreground">{detalheEvento.turmaDescricao}</p>
                )}
                {detalheEvento.conteudo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {detalheEvento.conteudo.map((tag) => (
                      <StatusBadge key={tag} tone="muted">
                        {tag}
                      </StatusBadge>
                    ))}
                  </div>
                )}

                {movendo && (
                  <div className="space-y-2 rounded-md border border-border/60 p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label>Nova data</Label>
                        <Input
                          type="date"
                          value={novaDataMover}
                          onChange={(e) => setNovaDataMover(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Início</Label>
                        <Input
                          type="time"
                          value={novoInicioMover}
                          onChange={(e) => setNovoInicioMover(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Fim</Label>
                        <Input
                          type="time"
                          value={novoFimMover}
                          onChange={(e) => setNovoFimMover(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setMovendo(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" size="sm" onClick={() => confirmarMover(detalheEvento)}>
                        Confirmar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {!movendo && (
                <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                  {detalheEvento.origem === "avulsa" && detalheEvento.avulsaId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEditarAvulsa(detalheEvento.avulsaId!)}
                      >
                        <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400"
                        onClick={() => excluirAvulsa(detalheEvento.avulsaId!)}
                      >
                        <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </>
                  )}
                  {detalheEvento.origem === "recorrente" && detalheEvento.recorrenteId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEditarTurma(detalheEvento.recorrenteId!)}
                      >
                        <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                        Editar turma
                      </Button>
                      {detalheEvento.cancelada ? (
                        <Button variant="outline" size="sm" onClick={() => reativarOcorrencia(detalheEvento)}>
                          Reativar esta ocorrência
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => iniciarMover(detalheEvento)}>
                            Mover esta ocorrência
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400"
                            onClick={() => cancelarOcorrencia(detalheEvento)}
                          >
                            Cancelar esta ocorrência
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Criar/editar turma recorrente */}
      <Dialog
        open={!!dialogRecorrente}
        onOpenChange={(open) => !open && !salvandoRecorrente && setDialogRecorrente(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogRecorrente?.editing ? "Editar turma" : "Nova turma recorrente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRecorrente} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-titulo">Título</Label>
                <Input
                  id="rec-titulo"
                  value={formRecorrente.titulo}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, titulo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-professor">Professor</Label>
                <Input
                  id="rec-professor"
                  value={formRecorrente.professor}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, professor: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-turma-desc">Alunos / turma (texto livre)</Label>
              <Input
                id="rec-turma-desc"
                value={formRecorrente.turmaDescricao}
                onChange={(e) => setFormRecorrente((f) => ({ ...f, turmaDescricao: e.target.value }))}
                placeholder="Ex.: Ana, Nicolas e Ruan"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA.map((dia) => (
                  <label key={dia.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={formRecorrente.diasSemana.includes(dia.value)}
                      onCheckedChange={() => toggleDiaSemana(dia.value)}
                    />
                    {dia.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-inicio">Horário de início</Label>
                <Input
                  id="rec-inicio"
                  type="time"
                  value={formRecorrente.horarioInicio}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, horarioInicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-fim">Horário de término</Label>
                <Input
                  id="rec-fim"
                  type="time"
                  value={formRecorrente.horarioFim}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, horarioFim: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-conteudo">Conteúdo (separado por vírgula)</Label>
              <Input
                id="rec-conteudo"
                value={formRecorrente.conteudo}
                onChange={(e) => setFormRecorrente((f) => ({ ...f, conteudo: e.target.value }))}
                placeholder="Ex.: Excel, Power BI"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-data-inicio">Início da recorrência</Label>
                <Input
                  id="rec-data-inicio"
                  type="date"
                  value={formRecorrente.dataInicio}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, dataInicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-data-fim">Fim (opcional)</Label>
                <Input
                  id="rec-data-fim"
                  type="date"
                  value={formRecorrente.dataFim}
                  onChange={(e) => setFormRecorrente((f) => ({ ...f, dataFim: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-obs">Observações</Label>
              <Textarea
                id="rec-obs"
                value={formRecorrente.observacoes}
                onChange={(e) => setFormRecorrente((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            {dialogRecorrente?.editing && (
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={formRecorrente.ativo}
                  onCheckedChange={(checked) =>
                    setFormRecorrente((f) => ({ ...f, ativo: checked === true }))
                  }
                />
                Turma ativa (aparece no calendário)
              </label>
            )}

            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              {dialogRecorrente?.editing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-400"
                  onClick={() => excluirRecorrente(dialogRecorrente.editing!.id)}
                  disabled={salvandoRecorrente}
                >
                  <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
                  Apagar turma
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogRecorrente(null)}
                  disabled={salvandoRecorrente}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvandoRecorrente}>
                  {salvandoRecorrente ? "Salvando…" : dialogRecorrente?.editing ? "Salvar" : "Criar turma"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Criar/editar aula avulsa */}
      <Dialog
        open={!!dialogAvulsa}
        onOpenChange={(open) => !open && !salvandoAvulsa && setDialogAvulsa(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogAvulsa?.editing ? "Editar aula avulsa" : "Nova aula avulsa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAvulsa} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="av-titulo">Título</Label>
                <Input
                  id="av-titulo"
                  value={formAvulsa.titulo}
                  onChange={(e) => setFormAvulsa((f) => ({ ...f, titulo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="av-professor">Professor</Label>
                <Input
                  id="av-professor"
                  value={formAvulsa.professor}
                  onChange={(e) => setFormAvulsa((f) => ({ ...f, professor: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="av-turma-desc">Aluno (texto livre)</Label>
              <Input
                id="av-turma-desc"
                value={formAvulsa.turmaDescricao}
                onChange={(e) => setFormAvulsa((f) => ({ ...f, turmaDescricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="av-data">Data</Label>
                <Input
                  id="av-data"
                  type="date"
                  value={formAvulsa.data}
                  onChange={(e) => setFormAvulsa((f) => ({ ...f, data: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="av-inicio">Início</Label>
                <Input
                  id="av-inicio"
                  type="time"
                  value={formAvulsa.horarioInicio}
                  onChange={(e) => setFormAvulsa((f) => ({ ...f, horarioInicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="av-fim">Fim (opcional)</Label>
                <Input
                  id="av-fim"
                  type="time"
                  value={formAvulsa.horarioFim}
                  onChange={(e) => setFormAvulsa((f) => ({ ...f, horarioFim: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="av-conteudo">Conteúdo (separado por vírgula)</Label>
              <Input
                id="av-conteudo"
                value={formAvulsa.conteudo}
                onChange={(e) => setFormAvulsa((f) => ({ ...f, conteudo: e.target.value }))}
              />
            </div>

            {dialogAvulsa?.editing && (
              <div className="space-y-1.5">
                <Label htmlFor="av-status">Status</Label>
                <Select
                  value={formAvulsa.status}
                  onValueChange={(value) =>
                    setFormAvulsa((f) => ({ ...f, status: value as Avulsa["status"] }))
                  }
                  options={STATUS_AVULSA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="av-obs">Observações</Label>
              <Textarea
                id="av-obs"
                value={formAvulsa.observacoes}
                onChange={(e) => setFormAvulsa((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              {dialogAvulsa?.editing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-400"
                  onClick={() => excluirAvulsa(dialogAvulsa.editing!.id)}
                  disabled={salvandoAvulsa}
                >
                  <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
                  Apagar
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogAvulsa(null)}
                  disabled={salvandoAvulsa}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvandoAvulsa}>
                  {salvandoAvulsa ? "Salvando…" : dialogAvulsa?.editing ? "Salvar" : "Criar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
