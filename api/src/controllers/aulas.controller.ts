import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { AulaRecorrente, DIAS_SEMANA, type DiaSemana } from "../models/AulaRecorrente";
import { AulaExcecao } from "../models/AulaExcecao";
import { AulaAvulsa, AULA_AVULSA_STATUS, type AulaAvulsaStatus } from "../models/AulaAvulsa";
import { expandirOcorrencias } from "../lib/aulas-ocorrencias";

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const HORARIO_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseTexto(input: unknown, campo: string): Parsed<string> {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { ok: false, error: `${campo} é obrigatório.` };
  }
  return { ok: true, value: input.trim() };
}

function parseHorario(input: unknown, campo: string): Parsed<string> {
  if (typeof input !== "string" || !HORARIO_REGEX.test(input)) {
    return { ok: false, error: `${campo} inválido. Use HH:mm.` };
  }
  return { ok: true, value: input };
}

function parseData(input: unknown, campo: string): Parsed<string> {
  if (typeof input !== "string" || !DATA_REGEX.test(input) || isNaN(new Date(`${input}T00:00:00`).getTime())) {
    return { ok: false, error: `${campo} inválida. Use YYYY-MM-DD.` };
  }
  return { ok: true, value: input };
}

function parseDiasSemana(input: unknown): Parsed<DiaSemana[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Selecione ao menos um dia da semana." };
  }
  const invalido = input.find((d) => !DIAS_SEMANA.includes(d));
  if (invalido !== undefined) {
    return { ok: false, error: `Dia da semana inválido: ${invalido}` };
  }
  return { ok: true, value: input as DiaSemana[] };
}

function parseConteudo(input: unknown): Parsed<string[]> {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input) || !input.every((v) => typeof v === "string")) {
    return { ok: false, error: "Conteúdo deve ser uma lista de textos." };
  }
  return { ok: true, value: input.map((v) => v.trim()).filter(Boolean) };
}

function serializeRecorrente(doc: InstanceType<typeof AulaRecorrente>) {
  return {
    id: doc._id.toString(),
    titulo: doc.titulo,
    professor: doc.professor,
    turmaDescricao: doc.turmaDescricao,
    diasSemana: doc.diasSemana,
    horarioInicio: doc.horarioInicio,
    horarioFim: doc.horarioFim,
    conteudo: doc.conteudo,
    ativo: doc.ativo,
    dataInicio: doc.dataInicio,
    dataFim: doc.dataFim,
    observacoes: doc.observacoes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeExcecao(doc: InstanceType<typeof AulaExcecao>) {
  return {
    id: doc._id.toString(),
    recorrenteId: doc.recorrenteId.toString(),
    data: doc.data,
    tipo: doc.tipo,
    novaData: doc.novaData,
    novoHorarioInicio: doc.novoHorarioInicio,
    novoHorarioFim: doc.novoHorarioFim,
    motivo: doc.motivo,
  };
}

function serializeAvulsa(doc: InstanceType<typeof AulaAvulsa>) {
  return {
    id: doc._id.toString(),
    titulo: doc.titulo,
    professor: doc.professor,
    turmaDescricao: doc.turmaDescricao,
    conteudo: doc.conteudo,
    data: doc.data,
    horarioInicio: doc.horarioInicio,
    horarioFim: doc.horarioFim,
    status: doc.status,
    observacoes: doc.observacoes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── Turmas recorrentes ───────────────────────────────────────────────────────

export async function listRecorrentes(c: Context<AppEnv>): Promise<Response> {
  try {
    const somenteAtivas = c.req.query("ativo") === "true";
    const filtro = somenteAtivas ? { ativo: true } : {};
    const recorrentes = await AulaRecorrente.find(filtro).sort({ titulo: 1 });
    return c.json({ recorrentes: recorrentes.map(serializeRecorrente) });
  } catch (error) {
    console.error("[aulas] listRecorrentes error:", error);
    return c.json({ message: "Erro ao listar turmas recorrentes." }, 500);
  }
}

export async function createRecorrente(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();

    const titulo = parseTexto(body.titulo, "Título");
    if (!titulo.ok) return c.json({ message: titulo.error }, 400);
    const professor = parseTexto(body.professor, "Professor");
    if (!professor.ok) return c.json({ message: professor.error }, 400);
    const diasSemana = parseDiasSemana(body.diasSemana);
    if (!diasSemana.ok) return c.json({ message: diasSemana.error }, 400);
    const horarioInicio = parseHorario(body.horarioInicio, "Horário de início");
    if (!horarioInicio.ok) return c.json({ message: horarioInicio.error }, 400);
    const horarioFim = parseHorario(body.horarioFim, "Horário de término");
    if (!horarioFim.ok) return c.json({ message: horarioFim.error }, 400);
    const conteudo = parseConteudo(body.conteudo);
    if (!conteudo.ok) return c.json({ message: conteudo.error }, 400);
    const dataInicio = parseData(body.dataInicio, "Data de início");
    if (!dataInicio.ok) return c.json({ message: dataInicio.error }, 400);

    let dataFimValue: string | null = null;
    if (body.dataFim !== undefined && body.dataFim !== null && body.dataFim !== "") {
      const parsed = parseData(body.dataFim, "Data de término");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      dataFimValue = parsed.value;
    }

    const recorrente = await AulaRecorrente.create({
      titulo: titulo.value,
      professor: professor.value,
      turmaDescricao: typeof body.turmaDescricao === "string" ? body.turmaDescricao.trim() : "",
      diasSemana: diasSemana.value,
      horarioInicio: horarioInicio.value,
      horarioFim: horarioFim.value,
      conteudo: conteudo.value,
      dataInicio: dataInicio.value,
      dataFim: dataFimValue,
      observacoes: typeof body.observacoes === "string" ? body.observacoes.trim() : "",
    });

    return c.json({ recorrente: serializeRecorrente(recorrente) }, 201);
  } catch (error) {
    console.error("[aulas] createRecorrente error:", error);
    return c.json({ message: "Erro ao criar turma recorrente." }, 500);
  }
}

export async function updateRecorrente(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: Record<string, unknown> = {};

    if (body.titulo !== undefined) {
      const parsed = parseTexto(body.titulo, "Título");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.titulo = parsed.value;
    }
    if (body.professor !== undefined) {
      const parsed = parseTexto(body.professor, "Professor");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.professor = parsed.value;
    }
    if (body.turmaDescricao !== undefined) {
      updates.turmaDescricao = typeof body.turmaDescricao === "string" ? body.turmaDescricao.trim() : "";
    }
    if (body.diasSemana !== undefined) {
      const parsed = parseDiasSemana(body.diasSemana);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.diasSemana = parsed.value;
    }
    if (body.horarioInicio !== undefined) {
      const parsed = parseHorario(body.horarioInicio, "Horário de início");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.horarioInicio = parsed.value;
    }
    if (body.horarioFim !== undefined) {
      const parsed = parseHorario(body.horarioFim, "Horário de término");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.horarioFim = parsed.value;
    }
    if (body.conteudo !== undefined) {
      const parsed = parseConteudo(body.conteudo);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.conteudo = parsed.value;
    }
    if (body.dataInicio !== undefined) {
      const parsed = parseData(body.dataInicio, "Data de início");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.dataInicio = parsed.value;
    }
    if (body.dataFim !== undefined) {
      if (body.dataFim === null || body.dataFim === "") {
        updates.dataFim = null;
      } else {
        const parsed = parseData(body.dataFim, "Data de término");
        if (!parsed.ok) return c.json({ message: parsed.error }, 400);
        updates.dataFim = parsed.value;
      }
    }
    if (body.ativo !== undefined) updates.ativo = Boolean(body.ativo);
    if (body.observacoes !== undefined) {
      updates.observacoes = typeof body.observacoes === "string" ? body.observacoes.trim() : "";
    }

    const recorrente = await AulaRecorrente.findByIdAndUpdate(id, updates, { new: true });
    if (!recorrente) return c.json({ message: "Turma recorrente não encontrada." }, 404);

    return c.json({ recorrente: serializeRecorrente(recorrente) });
  } catch (error) {
    console.error("[aulas] updateRecorrente error:", error);
    return c.json({ message: "Erro ao atualizar turma recorrente." }, 500);
  }
}

export async function deleteRecorrente(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = c.req.param("id");
    const recorrente = await AulaRecorrente.findByIdAndDelete(id);
    if (!recorrente) return c.json({ message: "Turma recorrente não encontrada." }, 404);

    const { deletedCount } = await AulaExcecao.deleteMany({ recorrenteId: id });
    return c.json({ deletedId: id, excecoesRemovidas: deletedCount ?? 0 });
  } catch (error) {
    console.error("[aulas] deleteRecorrente error:", error);
    return c.json({ message: "Erro ao apagar turma recorrente." }, 500);
  }
}

// ── Exceções (cancelar / mover uma ocorrência específica) ───────────────────

export async function createExcecao(c: Context<AppEnv>): Promise<Response> {
  try {
    const recorrenteId = c.req.param("id");
    const recorrente = await AulaRecorrente.findById(recorrenteId);
    if (!recorrente) return c.json({ message: "Turma recorrente não encontrada." }, 404);

    const body = await c.req.json();
    const data = parseData(body.data, "Data da ocorrência");
    if (!data.ok) return c.json({ message: data.error }, 400);

    if (body.tipo !== "cancelada" && body.tipo !== "reagendada") {
      return c.json({ message: "Tipo de exceção inválido. Use 'cancelada' ou 'reagendada'." }, 400);
    }

    let novaData: string | null = null;
    let novoHorarioInicio: string | null = null;
    let novoHorarioFim: string | null = null;

    if (body.tipo === "reagendada") {
      if (body.novaData !== undefined && body.novaData !== null && body.novaData !== "") {
        const parsed = parseData(body.novaData, "Nova data");
        if (!parsed.ok) return c.json({ message: parsed.error }, 400);
        novaData = parsed.value;
      }
      if (body.novoHorarioInicio !== undefined && body.novoHorarioInicio !== null && body.novoHorarioInicio !== "") {
        const parsed = parseHorario(body.novoHorarioInicio, "Novo horário de início");
        if (!parsed.ok) return c.json({ message: parsed.error }, 400);
        novoHorarioInicio = parsed.value;
      }
      if (body.novoHorarioFim !== undefined && body.novoHorarioFim !== null && body.novoHorarioFim !== "") {
        const parsed = parseHorario(body.novoHorarioFim, "Novo horário de término");
        if (!parsed.ok) return c.json({ message: parsed.error }, 400);
        novoHorarioFim = parsed.value;
      }
      if (!novaData && !novoHorarioInicio && !novoHorarioFim) {
        return c.json({ message: "Reagendamento precisa de nova data e/ou novo horário." }, 400);
      }
    }

    const excecao = await AulaExcecao.findOneAndUpdate(
      { recorrenteId, data: data.value },
      {
        recorrenteId,
        data: data.value,
        tipo: body.tipo,
        novaData,
        novoHorarioInicio,
        novoHorarioFim,
        motivo: typeof body.motivo === "string" ? body.motivo.trim() : "",
      },
      { upsert: true, new: true },
    );

    return c.json({ excecao: serializeExcecao(excecao) }, 201);
  } catch (error) {
    console.error("[aulas] createExcecao error:", error);
    return c.json({ message: "Erro ao criar exceção." }, 500);
  }
}

export async function deleteExcecao(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = c.req.param("id");
    const excecao = await AulaExcecao.findByIdAndDelete(id);
    if (!excecao) return c.json({ message: "Exceção não encontrada." }, 404);
    return c.json({ deletedId: id });
  } catch (error) {
    console.error("[aulas] deleteExcecao error:", error);
    return c.json({ message: "Erro ao apagar exceção." }, 500);
  }
}

// ── Aulas avulsas ────────────────────────────────────────────────────────────

export async function listAvulsas(c: Context<AppEnv>): Promise<Response> {
  try {
    const avulsas = await AulaAvulsa.find().sort({ data: 1 });
    return c.json({ avulsas: avulsas.map(serializeAvulsa) });
  } catch (error) {
    console.error("[aulas] listAvulsas error:", error);
    return c.json({ message: "Erro ao listar aulas avulsas." }, 500);
  }
}

export async function createAvulsa(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();

    const titulo = parseTexto(body.titulo, "Título");
    if (!titulo.ok) return c.json({ message: titulo.error }, 400);
    const professor = parseTexto(body.professor, "Professor");
    if (!professor.ok) return c.json({ message: professor.error }, 400);
    const data = parseData(body.data, "Data");
    if (!data.ok) return c.json({ message: data.error }, 400);
    const horarioInicio = parseHorario(body.horarioInicio, "Horário de início");
    if (!horarioInicio.ok) return c.json({ message: horarioInicio.error }, 400);
    const conteudo = parseConteudo(body.conteudo);
    if (!conteudo.ok) return c.json({ message: conteudo.error }, 400);

    let horarioFimValue: string | null = null;
    if (body.horarioFim !== undefined && body.horarioFim !== null && body.horarioFim !== "") {
      const parsed = parseHorario(body.horarioFim, "Horário de término");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      horarioFimValue = parsed.value;
    }

    let status: AulaAvulsaStatus = "agendada";
    if (body.status !== undefined && body.status !== null && body.status !== "") {
      if (!AULA_AVULSA_STATUS.includes(body.status)) {
        return c.json({ message: "Status inválido." }, 400);
      }
      status = body.status;
    }

    const avulsa = await AulaAvulsa.create({
      titulo: titulo.value,
      professor: professor.value,
      turmaDescricao: typeof body.turmaDescricao === "string" ? body.turmaDescricao.trim() : "",
      conteudo: conteudo.value,
      data: data.value,
      horarioInicio: horarioInicio.value,
      horarioFim: horarioFimValue,
      status,
      observacoes: typeof body.observacoes === "string" ? body.observacoes.trim() : "",
    });

    return c.json({ avulsa: serializeAvulsa(avulsa) }, 201);
  } catch (error) {
    console.error("[aulas] createAvulsa error:", error);
    return c.json({ message: "Erro ao criar aula avulsa." }, 500);
  }
}

export async function updateAvulsa(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: Record<string, unknown> = {};

    if (body.titulo !== undefined) {
      const parsed = parseTexto(body.titulo, "Título");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.titulo = parsed.value;
    }
    if (body.professor !== undefined) {
      const parsed = parseTexto(body.professor, "Professor");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.professor = parsed.value;
    }
    if (body.turmaDescricao !== undefined) {
      updates.turmaDescricao = typeof body.turmaDescricao === "string" ? body.turmaDescricao.trim() : "";
    }
    if (body.conteudo !== undefined) {
      const parsed = parseConteudo(body.conteudo);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.conteudo = parsed.value;
    }
    if (body.data !== undefined) {
      const parsed = parseData(body.data, "Data");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.data = parsed.value;
    }
    if (body.horarioInicio !== undefined) {
      const parsed = parseHorario(body.horarioInicio, "Horário de início");
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.horarioInicio = parsed.value;
    }
    if (body.horarioFim !== undefined) {
      if (body.horarioFim === null || body.horarioFim === "") {
        updates.horarioFim = null;
      } else {
        const parsed = parseHorario(body.horarioFim, "Horário de término");
        if (!parsed.ok) return c.json({ message: parsed.error }, 400);
        updates.horarioFim = parsed.value;
      }
    }
    if (body.status !== undefined) {
      if (!AULA_AVULSA_STATUS.includes(body.status)) {
        return c.json({ message: "Status inválido." }, 400);
      }
      updates.status = body.status;
    }
    if (body.observacoes !== undefined) {
      updates.observacoes = typeof body.observacoes === "string" ? body.observacoes.trim() : "";
    }

    const avulsa = await AulaAvulsa.findByIdAndUpdate(id, updates, { new: true });
    if (!avulsa) return c.json({ message: "Aula avulsa não encontrada." }, 404);

    return c.json({ avulsa: serializeAvulsa(avulsa) });
  } catch (error) {
    console.error("[aulas] updateAvulsa error:", error);
    return c.json({ message: "Erro ao atualizar aula avulsa." }, 500);
  }
}

export async function deleteAvulsa(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = c.req.param("id");
    const avulsa = await AulaAvulsa.findByIdAndDelete(id);
    if (!avulsa) return c.json({ message: "Aula avulsa não encontrada." }, 404);
    return c.json({ deletedId: id });
  } catch (error) {
    console.error("[aulas] deleteAvulsa error:", error);
    return c.json({ message: "Erro ao apagar aula avulsa." }, 500);
  }
}

// ── Calendário (expansão de ocorrências) ────────────────────────────────────

export async function listEventos(c: Context<AppEnv>): Promise<Response> {
  try {
    const from = c.req.query("from");
    const to = c.req.query("to");
    if (!from || !DATA_REGEX.test(from)) return c.json({ message: "Parâmetro 'from' inválido. Use YYYY-MM-DD." }, 400);
    if (!to || !DATA_REGEX.test(to)) return c.json({ message: "Parâmetro 'to' inválido. Use YYYY-MM-DD." }, 400);
    if (to < from) return c.json({ message: "'to' não pode ser antes de 'from'." }, 400);

    const [recorrentes, excecoes, avulsas] = await Promise.all([
      AulaRecorrente.find(),
      AulaExcecao.find(),
      AulaAvulsa.find(),
    ]);

    const eventos = expandirOcorrencias({
      recorrentes: recorrentes.map((r) => ({
        id: r._id.toString(),
        titulo: r.titulo,
        professor: r.professor,
        turmaDescricao: r.turmaDescricao,
        diasSemana: r.diasSemana,
        horarioInicio: r.horarioInicio,
        horarioFim: r.horarioFim,
        conteudo: r.conteudo,
        ativo: r.ativo,
        dataInicio: r.dataInicio,
        dataFim: r.dataFim,
      })),
      excecoes: excecoes.map((e) => ({
        id: e._id.toString(),
        recorrenteId: e.recorrenteId.toString(),
        data: e.data,
        tipo: e.tipo,
        novaData: e.novaData,
        novoHorarioInicio: e.novoHorarioInicio,
        novoHorarioFim: e.novoHorarioFim,
        motivo: e.motivo,
      })),
      avulsas: avulsas.map((a) => ({
        id: a._id.toString(),
        titulo: a.titulo,
        professor: a.professor,
        turmaDescricao: a.turmaDescricao,
        conteudo: a.conteudo,
        data: a.data,
        horarioInicio: a.horarioInicio,
        horarioFim: a.horarioFim,
        status: a.status,
      })),
      from,
      to,
    });

    return c.json({ eventos });
  } catch (error) {
    console.error("[aulas] listEventos error:", error);
    return c.json({ message: "Erro ao montar eventos do calendário." }, 500);
  }
}
