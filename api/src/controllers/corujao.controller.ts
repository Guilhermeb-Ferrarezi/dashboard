import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

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

const SERVICOS_VALIDOS = ["corujao", "campeonato", "locacao_hora"] as const;
type Servico = (typeof SERVICOS_VALIDOS)[number];

// Normaliza string de tag: trim + collapse de espaços. Mantém o case original
// (display-friendly), mas a comparação de duplicidade ignora case.
function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

// Dedup case-insensitive preservando o primeiro case encontrado.
function dedupTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of tags) {
    const normalized = normalizeTag(t);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function parseJogos(input: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false, error: "Jogos deve ser uma lista." };
  for (const t of input) {
    if (typeof t !== "string") return { ok: false, error: "Cada jogo deve ser texto." };
    if (t.length > 50) return { ok: false, error: "Nome do jogo muito longo (máx 50)." };
  }
  return { ok: true, value: dedupTags(input as string[]) };
}

function parseServicos(input: unknown): { ok: true; value: Servico[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false, error: "Serviços deve ser uma lista." };
  const valid: Servico[] = [];
  const seen = new Set<string>();
  for (const s of input) {
    if (typeof s !== "string") return { ok: false, error: "Cada serviço deve ser texto." };
    if (!SERVICOS_VALIDOS.includes(s as Servico)) {
      return { ok: false, error: `Serviço inválido: ${s}` };
    }
    if (seen.has(s)) continue;
    seen.add(s);
    valid.push(s as Servico);
  }
  return { ok: true, value: valid };
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
    jogos: row.jogos ?? [],
    servicos: row.servicos ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listContatos(c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    const { page, limit, skip: offset } = parsePagination(c, 50);
    const q = String(c.req.query("q") || "").trim();

    let statusConversaFilter: StatusConversa | undefined;
    const rawStatusConversa = c.req.query("statusConversa");
    if (rawStatusConversa !== undefined && rawStatusConversa !== "") {
      if (
        typeof rawStatusConversa !== "string" ||
        !STATUS_CONVERSA_VALIDOS.includes(rawStatusConversa as StatusConversa)
      ) {
        return c.json({ message: "Status de conversa inválido." }, 400);
      }
      statusConversaFilter = rawStatusConversa as StatusConversa;
    }

    let statusPagamentoFilter: StatusPagamento | undefined;
    const rawStatusPagamento = c.req.query("statusPagamento");
    if (rawStatusPagamento !== undefined && rawStatusPagamento !== "") {
      if (
        typeof rawStatusPagamento !== "string" ||
        !STATUS_PAGAMENTO_VALIDOS.includes(rawStatusPagamento as StatusPagamento)
      ) {
        return c.json({ message: "Status de pagamento inválido." }, 400);
      }
      statusPagamentoFilter = rawStatusPagamento as StatusPagamento;
    }

    let jaParticipouFilter: boolean | undefined;
    const rawJaParticipou = c.req.query("jaParticipou");
    if (rawJaParticipou !== undefined && rawJaParticipou !== "") {
      const raw = String(rawJaParticipou);
      if (raw !== "true" && raw !== "false") {
        return c.json({ message: "Filtro jaParticipou deve ser true ou false." }, 400);
      }
      jaParticipouFilter = raw === "true";
    }

    const naoRespondeu = c.req.query("naoRespondeu") === "true";
    const chamou = c.req.query("chamou") === "true";
    const naoChamou = c.req.query("naoChamou") === "true";
    const jogoFilter = c.req.query("jogo")?.trim() ?? "";
    const servicoFilter = c.req.query("servico")?.trim() ?? "";
    const numeroInvalido = c.req.query("numeroInvalido") === "true";

    const sortByRaw = String(c.req.query("sortBy") || "prioridade");
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
    // Filtros case-insensitive em arrays via lowercase comparison.
    if (jogoFilter) {
      conditions.push(sql`EXISTS (SELECT 1 FROM unnest(${schema.corujaoContatos.jogos}) AS t WHERE LOWER(t) = LOWER(${jogoFilter}))`);
    }
    if (servicoFilter) {
      conditions.push(sql`${servicoFilter} = ANY(${schema.corujaoContatos.servicos})`);
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

    return c.json({
      contatos: contatos.map(serializeContato),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error("[corujao] listContatos error:", error);
    return c.json({ message: "Erro ao listar contatos." }, 500);
  }
}

export async function createContato(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { nome, telefone, email, origem, observacoes, dataNascimento, jogos, servicos } = body as {
      nome?: string | null;
      telefone?: string;
      email?: string | null;
      origem?: string;
      observacoes?: string | null;
      dataNascimento?: string | null;
      jogos?: string[];
      servicos?: string[];
    };

    if (!telefone?.trim()) {
      return c.json({ message: "Telefone é obrigatório." }, 400);
    }

    let origemVal: Origem = "espontaneo";
    if (origem !== undefined && origem !== null && origem !== "") {
      if (!ORIGENS_VALIDAS.includes(origem as Origem)) {
        return c.json({ message: "Origem inválida." }, 400);
      }
      origemVal = origem as Origem;
    }

    const birth = parseOptionalBirthDate(dataNascimento);
    if (!birth.ok) return c.json({ message: birth.error }, 400);

    const parsedJogos = parseJogos(jogos);
    if (!parsedJogos.ok) return res.status(400).json({ message: parsedJogos.error });

    const parsedServicos = parseServicos(servicos);
    if (!parsedServicos.ok) return res.status(400).json({ message: parsedServicos.error });

    const db = getCheckoutDb();
    const [contato] = await db
      .insert(schema.corujaoContatos)
      .values({
        nome: nome?.trim() || null,
        telefone: telefone.trim(),
        email: email?.trim() || null,
        dataNascimento: birth.value,
        origem: origemVal,
        observacoes: observacoes?.trim() || null,
        jogos: parsedJogos.value,
        servicos: parsedServicos.value
      })
      .returning();

    return c.json({ contato: serializeContato(contato!) }, 201);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: duplicateMessage(error) }, 409);
    }
    console.error("[corujao] createContato error:", error);
    return c.json({ message: "Erro ao criar contato." }, 500);
  }
}

export async function updateContato(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const body = await c.req.json();
    const {
      nome,
      telefone,
      email,
      origem,
      observacoes,
      dataNascimento,
      statusConversa,
      statusPagamento,
      ultimoContatoEm,
      jogos,
      servicos
    } = body as {
      nome?: string | null;
      telefone?: string;
      email?: string | null;
      origem?: string;
      observacoes?: string | null;
      dataNascimento?: string | null;
      statusConversa?: string | null;
      statusPagamento?: string | null;
      ultimoContatoEm?: string | null;
      jogos?: string[];
      servicos?: string[];
    };

    const updates: Partial<typeof schema.corujaoContatos.$inferInsert> = {
      updatedAt: new Date()
    };

    if (nome !== undefined) {
      updates.nome = nome?.trim() || null;
    }

    if (telefone !== undefined) {
      if (!telefone.trim()) return c.json({ message: "Telefone é obrigatório." }, 400);
      updates.telefone = telefone.trim();
    }

    if (email !== undefined) {
      updates.email = email?.trim() || null;
    }

    if (dataNascimento !== undefined) {
      const birth = parseOptionalBirthDate(dataNascimento);
      if (!birth.ok) return c.json({ message: birth.error }, 400);
      updates.dataNascimento = birth.value;
    }

    if (origem !== undefined) {
      if (!ORIGENS_VALIDAS.includes(origem as Origem)) {
        return c.json({ message: "Origem inválida." }, 400);
      }
      updates.origem = origem as Origem;
    }

    if (observacoes !== undefined) {
      updates.observacoes = observacoes?.trim() || null;
    }

    if (statusConversa !== undefined) {
      const parsed = parseStatusConversa(statusConversa);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.statusConversa = parsed.value;
    }

    if (statusPagamento !== undefined) {
      const parsed = parseStatusPagamento(statusPagamento);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.statusPagamento = parsed.value;
    }

    if (ultimoContatoEm !== undefined) {
      const parsed = parseISODateTime(ultimoContatoEm);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.ultimoContatoEm = parsed.value;
    }

    if (jogos !== undefined) {
      const parsed = parseJogos(jogos);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.jogos = parsed.value;
    }

    if (servicos !== undefined) {
      const parsed = parseServicos(servicos);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.servicos = parsed.value;
    }

    const db = getCheckoutDb();
    const [contato] = await db
      .update(schema.corujaoContatos)
      .set(updates)
      .where(eq(schema.corujaoContatos.id, id))
      .returning();

    if (!contato) return c.json({ message: "Contato não encontrado." }, 404);

    return c.json({ contato: serializeContato(contato) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: duplicateMessage(error) }, 409);
    }
    console.error("[corujao] updateContato error:", error);
    return c.json({ message: "Erro ao atualizar contato." }, 500);
  }
}

export async function marcarContato(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const now = new Date();
    const db = getCheckoutDb();
    const [contato] = await db
      .update(schema.corujaoContatos)
      .set({ ultimoContatoEm: now, updatedAt: now })
      .where(eq(schema.corujaoContatos.id, id))
      .returning();

    if (!contato) return c.json({ message: "Contato não encontrado." }, 404);

    return c.json({ contato: serializeContato(contato) });
  } catch (error) {
    console.error("[corujao] marcarContato error:", error);
    return c.json({ message: "Erro ao marcar contato." }, 500);
  }
}

export async function deleteContato(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ message: "ID inválido." }, 400);
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
      return c.json({ message: "Contato não encontrado." }, 404);
    }

    return c.json({
      deletedId: id,
      visitasRemovidas,
      receitaRemovidaCents
    });
  } catch (error: unknown) {
    // corujao_vendas.contato_id é ON DELETE RESTRICT (tabela vazia hoje,
    // mas previne perda silenciosa de venda quando entrar em uso).
    const pgError = error as { code?: string };
    if (pgError.code === "23503") {
      return c.json({
        message: "Contato tem vendas registradas — apague as vendas antes."
      }, 409);
    }
    console.error("[corujao] deleteContato error:", error);
    return c.json({ message: "Erro ao apagar contato." }, 500);
  }
}

export async function importarContatos(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { contatos } = body as {
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
      return c.json({ message: "Envie um array 'contatos' com pelo menos 1 item." }, 400);
    }

    if (contatos.length > 5000) {
      return c.json({ message: "Máximo de 5000 contatos por importação." }, 400);
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

    return c.json({
      importados,
      duplicados,
      erros: erros.slice(0, 50),
      totalEnviados: contatos.length
    });
  } catch (error) {
    console.error("[corujao] importarContatos error:", error);
    return c.json({ message: "Erro ao importar contatos." }, 500);
  }
}

export async function exportarContatos(_c: Context<AppEnv>): Promise<Response> {
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

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=contatos-corujao.csv",
      },
    });
  } catch (error) {
    console.error("[corujao] exportarContatos error:", error);
    return _c.json({ message: "Erro ao exportar contatos." }, 500);
  }
}

// Retorna todos os jogos distintos cadastrados em contatos + os predefinidos
// do frontend (consolidados aqui pra autocomplete sem duplicar lista no client).
export async function listJogosDisponiveis(_c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    const rows = await db.execute<{ jogo: string }>(
      sql`SELECT DISTINCT unnest(jogos) AS jogo FROM corujao_contatos WHERE array_length(jogos, 1) > 0 ORDER BY jogo`
    );
    const jogos = (rows as unknown as { jogo: string }[]).map((r) => r.jogo).filter(Boolean);
    return _c.json({ jogos });
  } catch (error) {
    console.error("[corujao] listJogosDisponiveis error:", error);
    return _c.json({ message: "Erro ao listar jogos." }, 500);
  }
}

export async function getContatosMetricas(_c: Context<AppEnv>): Promise<Response> {
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

    return _c.json({
      total: row?.total ?? 0,
      naoChamou: row?.naoChamou ?? 0,
      chamou: row?.chamou ?? 0,
      respondeu: row?.respondeu ?? 0,
      naoRespondeu: row?.naoRespondeu ?? 0,
      numeroInvalido: row?.numeroInvalido ?? 0
    });
  } catch (error) {
    console.error("[corujao] getContatosMetricas error:", error);
    return _c.json({ message: "Erro ao calcular métricas." }, 500);
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
