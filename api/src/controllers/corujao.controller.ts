import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";
import { parsePagination } from "../lib/pagination";

const IMPORT_BATCH_SIZE = 100;

function duplicateMessage(error: unknown): string {
  const detail = (error as { detail?: string }).detail ?? "";
  if (detail.includes("email")) {
    return "Já existe um contato com esse email. Busque por ele na lista.";
  }
  return "Já existe um contato com esse telefone. Busque por ele na lista.";
}

const ORIGENS_VALIDAS = ["anuncio", "indicacao", "espontaneo", "outro"] as const;
type Origem = (typeof ORIGENS_VALIDAS)[number];

const STATUS_CONVERSA_VALIDOS = ["sem_resposta", "aguardando", "confirmou", "recusou"] as const;
type StatusConversa = (typeof STATUS_CONVERSA_VALIDOS)[number];

const STATUS_PAGAMENTO_VALIDOS = [
  "pendente",
  "confirmou_pagou",
  "confirmou_nao_pagou",
  "paga_na_hora"
] as const;
type StatusPagamento = (typeof STATUS_PAGAMENTO_VALIDOS)[number];

type ParsedBirth =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

type ParsedStatus<T> = { ok: true; value: T | null } | { ok: false; error: string };

// Aceita: undefined/null/"" → null. String "YYYY-MM-DD" válida e não-futura → mesma string.
// Hoje é permitido (margem de fuso); só amanhã+ rejeita.
export function parseOptionalBirthDate(input: unknown): ParsedBirth {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: null };
  }
  if (typeof input !== "string") {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  const parsed = new Date(`${input}T00:00:00`);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed.getTime() > today.getTime()) {
    return { ok: false, error: "Data de nascimento não pode ser no futuro." };
  }
  return { ok: true, value: input };
}

// Aceita: undefined/null/"" → null. Valor do enum → mesmo valor.
export function parseStatusConversa(input: unknown): ParsedStatus<StatusConversa> {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: null };
  }
  if (typeof input !== "string" || !STATUS_CONVERSA_VALIDOS.includes(input as StatusConversa)) {
    return { ok: false, error: "Status de conversa inválido." };
  }
  return { ok: true, value: input as StatusConversa };
}

// Aceita: null/"" → null. String ISO 8601 parseable por Date → Date. Qualquer outro formato → erro.
// Previne que new Date("string-inválida") = Invalid Date chegue ao Postgres como 500.
export function parseISODateTime(input: unknown): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (input === null || input === "") {
    return { ok: true, value: null };
  }
  if (typeof input !== "string") {
    return { ok: false, error: "ultimoContatoEm inválido." };
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    return { ok: false, error: "ultimoContatoEm inválido." };
  }
  return { ok: true, value: d };
}

// Aceita: undefined/null/"" → null. Valor do enum → mesmo valor.
export function parseStatusPagamento(input: unknown): ParsedStatus<StatusPagamento> {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: null };
  }
  if (
    typeof input !== "string" ||
    !STATUS_PAGAMENTO_VALIDOS.includes(input as StatusPagamento)
  ) {
    return { ok: false, error: "Status de pagamento inválido." };
  }
  return { ok: true, value: input as StatusPagamento };
}

function serializeContato(row: typeof schema.corujaoContatos.$inferSelect) {
  return {
    id: row.id,
    nome: row.nome ?? null,
    telefone: row.telefone ?? null,
    email: row.email ?? null,
    dataNascimento: row.dataNascimento ?? null,
    origem: row.origem,
    jaParticipou: row.jaParticipou,
    checkoutUserId: row.checkoutUserId ?? null,
    observacoes: row.observacoes ?? null,
    ultimoContatoEm: row.ultimoContatoEm ? row.ultimoContatoEm.toISOString() : null,
    statusConversa: row.statusConversa ?? null,
    statusPagamento: row.statusPagamento ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listContatos(req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const { page, limit, skip: offset } = parsePagination(req, 50);
    const q = String(req.query.q || "").trim();

    let statusConversaFilter: StatusConversa | undefined;
    if (req.query.statusConversa !== undefined && req.query.statusConversa !== "") {
      const raw = req.query.statusConversa;
      if (
        typeof raw !== "string" ||
        !STATUS_CONVERSA_VALIDOS.includes(raw as StatusConversa)
      ) {
        return res.status(400).json({ message: "Status de conversa inválido." });
      }
      statusConversaFilter = raw as StatusConversa;
    }

    let statusPagamentoFilter: StatusPagamento | undefined;
    if (req.query.statusPagamento !== undefined && req.query.statusPagamento !== "") {
      const raw = req.query.statusPagamento;
      if (
        typeof raw !== "string" ||
        !STATUS_PAGAMENTO_VALIDOS.includes(raw as StatusPagamento)
      ) {
        return res.status(400).json({ message: "Status de pagamento inválido." });
      }
      statusPagamentoFilter = raw as StatusPagamento;
    }

    let jaParticipouFilter: boolean | undefined;
    if (req.query.jaParticipou !== undefined && req.query.jaParticipou !== "") {
      const raw = String(req.query.jaParticipou);
      if (raw !== "true" && raw !== "false") {
        return res.status(400).json({ message: "Filtro jaParticipou deve ser true ou false." });
      }
      jaParticipouFilter = raw === "true";
    }

    const naoRespondeu = req.query.naoRespondeu === "true";
    const chamou = req.query.chamou === "true";
    const naoChamou = req.query.naoChamou === "true";
    const numeroInvalido = req.query.numeroInvalido === "true";

    const sortByRaw = String(req.query.sortBy || "prioridade");
    // "nome" mantido como alias de "alfabetico" pra compatibilidade.
    const sortByNormalized = sortByRaw === "nome" ? "alfabetico" : sortByRaw;
    const sortBy = (["recente", "alfabetico", "alfabetico_desc"].includes(sortByNormalized) ? sortByNormalized : "prioridade") as "prioridade" | "recente" | "alfabetico" | "alfabetico_desc";

    const conditions: SQL[] = [];
    if (q) {
      conditions.push(
        or(
          ilike(schema.corujaoContatos.nome, `%${q}%`),
          ilike(schema.corujaoContatos.telefone, `%${q}%`),
          ilike(schema.corujaoContatos.email, `%${q}%`)
        )!
      );
    }
    if (statusConversaFilter) {
      conditions.push(eq(schema.corujaoContatos.statusConversa, statusConversaFilter));
    }
    if (statusPagamentoFilter) {
      conditions.push(eq(schema.corujaoContatos.statusPagamento, statusPagamentoFilter));
    }
    if (jaParticipouFilter !== undefined) {
      conditions.push(eq(schema.corujaoContatos.jaParticipou, jaParticipouFilter));
    }
    if (naoRespondeu) {
      conditions.push(
        sql`${schema.corujaoContatos.ultimoContatoEm} IS NOT NULL
          AND (
            ${schema.corujaoContatos.statusConversa} = 'sem_resposta'
            OR (${schema.corujaoContatos.ultimoContatoEm} < NOW() - interval '24 hours' AND ${schema.corujaoContatos.statusConversa} IS NULL)
          )`
      );
    }
    if (chamou) {
      conditions.push(
        sql`${schema.corujaoContatos.ultimoContatoEm} IS NOT NULL
          AND (
            ${schema.corujaoContatos.ultimoContatoEm} >= NOW() - interval '24 hours'
            OR (${schema.corujaoContatos.statusConversa} IS NOT NULL AND ${schema.corujaoContatos.statusConversa} != 'sem_resposta')
          )`
      );
    }
    if (naoChamou) {
      conditions.push(sql`${schema.corujaoContatos.ultimoContatoEm} IS NULL`);
    }
    if (numeroInvalido) {
      conditions.push(eq(schema.corujaoContatos.statusConversa, "recusou"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderByClause =
      sortBy === "recente"
        ? [desc(schema.corujaoContatos.createdAt)]
        : sortBy === "alfabetico"
          ? [sql`${schema.corujaoContatos.nome} ASC NULLS LAST`, asc(schema.corujaoContatos.id)]
          : sortBy === "alfabetico_desc"
            ? [sql`${schema.corujaoContatos.nome} DESC NULLS LAST`, asc(schema.corujaoContatos.id)]
            : [
                sql`${schema.corujaoContatos.ultimoContatoEm} ASC NULLS FIRST`,
                desc(schema.corujaoContatos.createdAt)
              ];

    const [[totalRow], contatos] = await Promise.all([
      db.select({ value: count() }).from(schema.corujaoContatos).where(whereClause),
      db
        .select()
        .from(schema.corujaoContatos)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(limit)
        .offset(offset)
    ]);

    const total = totalRow?.value ?? 0;

    return res.json({
      contatos: contatos.map(serializeContato),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error("[corujao] listContatos error:", error);
    return res.status(500).json({ message: "Erro ao listar contatos." });
  }
}

export async function createContato(req: Request, res: Response) {
  try {
    const { nome, telefone, email, origem, observacoes, dataNascimento } = req.body as {
      nome?: string | null;
      telefone?: string;
      email?: string | null;
      origem?: string;
      observacoes?: string | null;
      dataNascimento?: string | null;
    };

    if (!telefone?.trim()) {
      return res.status(400).json({ message: "Telefone é obrigatório." });
    }

    let origemVal: Origem = "espontaneo";
    if (origem !== undefined && origem !== null && origem !== "") {
      if (!ORIGENS_VALIDAS.includes(origem as Origem)) {
        return res.status(400).json({ message: "Origem inválida." });
      }
      origemVal = origem as Origem;
    }

    const birth = parseOptionalBirthDate(dataNascimento);
    if (!birth.ok) return res.status(400).json({ message: birth.error });

    const db = getCheckoutDb();
    const [contato] = await db
      .insert(schema.corujaoContatos)
      .values({
        nome: nome?.trim() || null,
        telefone: telefone.trim(),
        email: email?.trim() || null,
        dataNascimento: birth.value,
        origem: origemVal,
        observacoes: observacoes?.trim() || null
      })
      .returning();

    return res.status(201).json({ contato: serializeContato(contato!) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: duplicateMessage(error) });
    }
    console.error("[corujao] createContato error:", error);
    return res.status(500).json({ message: "Erro ao criar contato." });
  }
}

export async function updateContato(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const {
      nome,
      telefone,
      email,
      origem,
      observacoes,
      dataNascimento,
      statusConversa,
      statusPagamento,
      ultimoContatoEm
    } = req.body as {
      nome?: string | null;
      telefone?: string;
      email?: string | null;
      origem?: string;
      observacoes?: string | null;
      dataNascimento?: string | null;
      statusConversa?: string | null;
      statusPagamento?: string | null;
      ultimoContatoEm?: string | null;
    };

    const updates: Partial<typeof schema.corujaoContatos.$inferInsert> = {
      updatedAt: new Date()
    };

    if (nome !== undefined) {
      updates.nome = nome?.trim() || null;
    }

    if (telefone !== undefined) {
      if (!telefone.trim()) return res.status(400).json({ message: "Telefone é obrigatório." });
      updates.telefone = telefone.trim();
    }

    if (email !== undefined) {
      updates.email = email?.trim() || null;
    }

    if (dataNascimento !== undefined) {
      const birth = parseOptionalBirthDate(dataNascimento);
      if (!birth.ok) return res.status(400).json({ message: birth.error });
      updates.dataNascimento = birth.value;
    }

    if (origem !== undefined) {
      if (!ORIGENS_VALIDAS.includes(origem as Origem)) {
        return res.status(400).json({ message: "Origem inválida." });
      }
      updates.origem = origem as Origem;
    }

    if (observacoes !== undefined) {
      updates.observacoes = observacoes?.trim() || null;
    }

    if (statusConversa !== undefined) {
      const parsed = parseStatusConversa(statusConversa);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.statusConversa = parsed.value;
    }

    if (statusPagamento !== undefined) {
      const parsed = parseStatusPagamento(statusPagamento);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.statusPagamento = parsed.value;
    }

    if (ultimoContatoEm !== undefined) {
      const parsed = parseISODateTime(ultimoContatoEm);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.ultimoContatoEm = parsed.value;
    }

    const db = getCheckoutDb();
    const [contato] = await db
      .update(schema.corujaoContatos)
      .set(updates)
      .where(eq(schema.corujaoContatos.id, id))
      .returning();

    if (!contato) return res.status(404).json({ message: "Contato não encontrado." });

    return res.json({ contato: serializeContato(contato) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: duplicateMessage(error) });
    }
    console.error("[corujao] updateContato error:", error);
    return res.status(500).json({ message: "Erro ao atualizar contato." });
  }
}

export async function marcarContato(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const now = new Date();
    const db = getCheckoutDb();
    const [contato] = await db
      .update(schema.corujaoContatos)
      .set({ ultimoContatoEm: now, updatedAt: now })
      .where(eq(schema.corujaoContatos.id, id))
      .returning();

    if (!contato) return res.status(404).json({ message: "Contato não encontrado." });

    return res.json({ contato: serializeContato(contato) });
  } catch (error) {
    console.error("[corujao] marcarContato error:", error);
    return res.status(500).json({ message: "Erro ao marcar contato." });
  }
}

export async function deleteContato(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const db = getCheckoutDb();

    // Conta visitas e soma receita ANTES do DELETE (informativo pra UI).
    // ON DELETE CASCADE do schema vai dropar visitas + contato_log junto.
    // Cortesia (amount_cents=0) entra no count mas não na receita.
    const [stats] = await db
      .select({
        visitasCount: sql<number>`COUNT(*)::int`,
        receitaCents: sql<number>`COALESCE(SUM(CASE WHEN ${schema.corujaoVisitas.formaPagamento} <> 'cortesia' THEN ${schema.corujaoVisitas.amountCents} ELSE 0 END), 0)::int`
      })
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.contatoId, id));

    const visitasRemovidas = stats?.visitasCount ?? 0;
    const receitaRemovidaCents = stats?.receitaCents ?? 0;

    const result = await db
      .delete(schema.corujaoContatos)
      .where(eq(schema.corujaoContatos.id, id))
      .returning({ id: schema.corujaoContatos.id });

    if (result.length === 0) {
      return res.status(404).json({ message: "Contato não encontrado." });
    }

    return res.json({
      deletedId: id,
      visitasRemovidas,
      receitaRemovidaCents
    });
  } catch (error: unknown) {
    // corujao_vendas.contato_id é ON DELETE RESTRICT (tabela vazia hoje,
    // mas previne perda silenciosa de venda quando entrar em uso).
    const pgError = error as { code?: string };
    if (pgError.code === "23503") {
      return res.status(409).json({
        message: "Contato tem vendas registradas — apague as vendas antes."
      });
    }
    console.error("[corujao] deleteContato error:", error);
    return res.status(500).json({ message: "Erro ao apagar contato." });
  }
}

export async function importarContatos(req: Request, res: Response) {
  try {
    const { contatos } = req.body as {
      contatos?: Array<{
        telefone?: string;
        nome?: string | null;
        email?: string | null;
        dataNascimento?: string | null;
        origem?: string | null;
        observacoes?: string | null;
      }>;
    };

    if (!Array.isArray(contatos) || contatos.length === 0) {
      return res.status(400).json({ message: "Envie um array 'contatos' com pelo menos 1 item." });
    }

    if (contatos.length > 5000) {
      return res.status(400).json({ message: "Máximo de 5000 contatos por importação." });
    }

    const db = getCheckoutDb();

    const validRows: Array<typeof schema.corujaoContatos.$inferInsert> = [];
    const erros: Array<{ linha: number; motivo: string }> = [];

    for (let i = 0; i < contatos.length; i++) {
      const row = contatos[i]!;
      const telefone = row.telefone?.toString().trim();

      if (!telefone) {
        erros.push({ linha: i + 1, motivo: "Telefone vazio." });
        continue;
      }

      let origemVal: Origem = "espontaneo";
      if (row.origem && ORIGENS_VALIDAS.includes(row.origem as Origem)) {
        origemVal = row.origem as Origem;
      }

      let dataNascimento: string | null = null;
      if (row.dataNascimento) {
        const birth = parseOptionalBirthDate(row.dataNascimento);
        if (birth.ok) dataNascimento = birth.value;
      }

      validRows.push({
        telefone,
        nome: row.nome?.trim() || null,
        email: row.email?.trim() || null,
        dataNascimento,
        origem: origemVal,
        observacoes: row.observacoes?.trim() || null
      });
    }

    let importados = 0;
    let duplicados = 0;

    for (let i = 0; i < validRows.length; i += IMPORT_BATCH_SIZE) {
      const batch = validRows.slice(i, i + IMPORT_BATCH_SIZE);
      const result = await db
        .insert(schema.corujaoContatos)
        .values(batch)
        .onConflictDoNothing({ target: schema.corujaoContatos.telefone })
        .returning({ id: schema.corujaoContatos.id });

      importados += result.length;
      duplicados += batch.length - result.length;
    }

    return res.json({
      importados,
      duplicados,
      erros: erros.slice(0, 50),
      totalEnviados: contatos.length
    });
  } catch (error) {
    console.error("[corujao] importarContatos error:", error);
    return res.status(500).json({ message: "Erro ao importar contatos." });
  }
}

export async function exportarContatos(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const contatos = await db
      .select()
      .from(schema.corujaoContatos)
      .orderBy(desc(schema.corujaoContatos.createdAt));

    const header = "nome,telefone,email,data_nascimento,origem,ja_participou,observacoes,criado_em";
    const rows = contatos.map((c) => {
      const fields = [
        csvEscape(c.nome ?? ""),
        csvEscape(c.telefone ?? ""),
        csvEscape(c.email ?? ""),
        csvEscape(c.dataNascimento ?? ""),
        csvEscape(c.origem),
        c.jaParticipou ? "sim" : "nao",
        csvEscape(c.observacoes ?? ""),
        c.createdAt.toISOString().slice(0, 10)
      ];
      return fields.join(",");
    });

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=contatos-corujao.csv");
    return res.send(csv);
  } catch (error) {
    console.error("[corujao] exportarContatos error:", error);
    return res.status(500).json({ message: "Erro ao exportar contatos." });
  }
}

export async function getContatosMetricas(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const [row] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        naoChamou: sql<number>`COUNT(*) FILTER (WHERE ${schema.corujaoContatos.ultimoContatoEm} IS NULL)::int`,
        chamou: sql<number>`COUNT(*) FILTER (WHERE ${schema.corujaoContatos.ultimoContatoEm} IS NOT NULL)::int`,
        respondeu: sql<number>`COUNT(*) FILTER (WHERE ${schema.corujaoContatos.statusConversa} IS NOT NULL AND ${schema.corujaoContatos.statusConversa} NOT IN ('sem_resposta', 'recusou'))::int`,
        naoRespondeu: sql<number>`COUNT(*) FILTER (WHERE ${schema.corujaoContatos.ultimoContatoEm} IS NOT NULL AND (${schema.corujaoContatos.statusConversa} = 'sem_resposta' OR (${schema.corujaoContatos.ultimoContatoEm} < NOW() - interval '24 hours' AND ${schema.corujaoContatos.statusConversa} IS NULL)))::int`,
        numeroInvalido: sql<number>`COUNT(*) FILTER (WHERE ${schema.corujaoContatos.statusConversa} = 'recusou')::int`
      })
      .from(schema.corujaoContatos);

    return res.json({
      total: row?.total ?? 0,
      naoChamou: row?.naoChamou ?? 0,
      chamou: row?.chamou ?? 0,
      respondeu: row?.respondeu ?? 0,
      naoRespondeu: row?.naoRespondeu ?? 0,
      numeroInvalido: row?.numeroInvalido ?? 0
    });
  } catch (error) {
    console.error("[corujao] getContatosMetricas error:", error);
    return res.status(500).json({ message: "Erro ao calcular métricas." });
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
