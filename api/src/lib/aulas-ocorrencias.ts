import type { DiaSemana } from "../models/AulaRecorrente";

const DIA_SEMANA_PARA_INDICE: Record<DiaSemana, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};
const INDICE_PARA_DIA_SEMANA: DiaSemana[] = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export type RecorrenteInput = {
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
};

export type ExcecaoInput = {
  id: string;
  recorrenteId: string;
  data: string;
  tipo: "cancelada" | "reagendada";
  novaData: string | null;
  novoHorarioInicio: string | null;
  novoHorarioFim: string | null;
  motivo: string;
};

export type AvulsaInput = {
  id: string;
  titulo: string;
  professor: string;
  turmaDescricao: string;
  conteudo: string[];
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  status: "agendada" | "realizada" | "cancelada";
};

export type Ocorrencia = {
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

// "YYYY-MM-DD" → Date local à meia-noite. Evita o construtor de string ISO
// do JS (que interpreta como UTC e pode "voltar" um dia em fusos negativos).
export function parseDataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano!, (mes ?? 1) - 1, dia ?? 1);
}

export function formatDataLocal(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function diaSemanaDe(iso: string): DiaSemana {
  return INDICE_PARA_DIA_SEMANA[parseDataLocal(iso).getDay()]!;
}

function* iterarDatas(fromIso: string, toIso: string): Generator<string> {
  const cursor = parseDataLocal(fromIso);
  const fim = parseDataLocal(toIso);
  while (cursor.getTime() <= fim.getTime()) {
    yield formatDataLocal(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
}

function dentroDoIntervalo(data: string, dataInicio: string, dataFim: string | null): boolean {
  if (data < dataInicio) return false;
  if (dataFim && data > dataFim) return false;
  return true;
}

/**
 * Expande turmas recorrentes num range de datas, aplica exceções
 * (cancelar/mover ocorrência) e mescla com aulas avulsas do mesmo range.
 */
export function expandirOcorrencias(params: {
  recorrentes: RecorrenteInput[];
  excecoes: ExcecaoInput[];
  avulsas: AvulsaInput[];
  from: string;
  to: string;
}): Ocorrencia[] {
  const { recorrentes, avulsas, from, to } = params;
  const ocorrencias: Ocorrencia[] = [];

  const excecoesPorRecorrente = new Map<string, ExcecaoInput[]>();
  for (const excecao of params.excecoes) {
    const lista = excecoesPorRecorrente.get(excecao.recorrenteId) ?? [];
    lista.push(excecao);
    excecoesPorRecorrente.set(excecao.recorrenteId, lista);
  }

  for (const recorrente of recorrentes) {
    if (!recorrente.ativo) continue;
    const excecoes = excecoesPorRecorrente.get(recorrente.id) ?? [];
    const excecaoPorData = new Map(excecoes.map((e) => [e.data, e]));

    // Passo 1: ocorrências no dia da semana natural da turma.
    for (const data of iterarDatas(from, to)) {
      if (!recorrente.diasSemana.includes(diaSemanaDe(data))) continue;
      if (!dentroDoIntervalo(data, recorrente.dataInicio, recorrente.dataFim)) continue;

      const excecao = excecaoPorData.get(data);
      if (!excecao) {
        ocorrencias.push(ocorrenciaDeRecorrente(recorrente, data, null, false));
        continue;
      }

      if (excecao.tipo === "cancelada") {
        ocorrencias.push(ocorrenciaDeRecorrente(recorrente, data, excecao.id, true));
        continue;
      }

      // reagendada: se moveu pra outra data, não emite aqui — reaparece no
      // Passo 2, na data nova. Se não moveu (só mudou horário), emite aqui.
      if (excecao.novaData && excecao.novaData !== data) continue;
      ocorrencias.push({
        ...ocorrenciaDeRecorrente(recorrente, data, excecao.id, false),
        horarioInicio: excecao.novoHorarioInicio ?? recorrente.horarioInicio,
        horarioFim: excecao.novoHorarioFim ?? recorrente.horarioFim,
      });
    }

    // Passo 2: ocorrências reagendadas para uma data fora do padrão semanal.
    for (const excecao of excecoes) {
      if (excecao.tipo !== "reagendada" || !excecao.novaData) continue;
      if (excecao.novaData === excecao.data) continue;
      if (excecao.novaData < from || excecao.novaData > to) continue;

      ocorrencias.push({
        ...ocorrenciaDeRecorrente(recorrente, excecao.novaData, excecao.id, false),
        horarioInicio: excecao.novoHorarioInicio ?? recorrente.horarioInicio,
        horarioFim: excecao.novoHorarioFim ?? recorrente.horarioFim,
        reagendadaDe: excecao.data,
      });
    }
  }

  for (const avulsa of avulsas) {
    if (avulsa.data < from || avulsa.data > to) continue;
    ocorrencias.push({
      id: `avulsa:${avulsa.id}`,
      origem: "avulsa",
      recorrenteId: null,
      avulsaId: avulsa.id,
      excecaoId: null,
      titulo: avulsa.titulo,
      professor: avulsa.professor,
      turmaDescricao: avulsa.turmaDescricao,
      conteudo: avulsa.conteudo,
      data: avulsa.data,
      horarioInicio: avulsa.horarioInicio,
      horarioFim: avulsa.horarioFim,
      cancelada: avulsa.status === "cancelada",
      reagendadaDe: null,
    });
  }

  ocorrencias.sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio));
  return ocorrencias;
}

function ocorrenciaDeRecorrente(
  recorrente: RecorrenteInput,
  data: string,
  excecaoId: string | null,
  cancelada: boolean,
): Ocorrencia {
  return {
    id: `recorrente:${recorrente.id}:${data}`,
    origem: "recorrente",
    recorrenteId: recorrente.id,
    avulsaId: null,
    excecaoId,
    titulo: recorrente.titulo,
    professor: recorrente.professor,
    turmaDescricao: recorrente.turmaDescricao,
    conteudo: recorrente.conteudo,
    data,
    horarioInicio: recorrente.horarioInicio,
    horarioFim: recorrente.horarioFim,
    cancelada,
    reagendadaDe: null,
  };
}
