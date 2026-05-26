import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

const STATUS_VALIDOS = ["planejado", "aberto", "lotado", "realizado", "cancelado"] as const;
type StatusSessao = (typeof STATUS_VALIDOS)[number];

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// "YYYY-MM-DD", obrigatória, não-passada (hoje é OK por margem de fuso).
export function parseSessaoData(input: unknown): Parsed<string> {
  if (typeof input !== "string" || input === "") {
    return { ok: false, error: "Data da sessão é obrigatória." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false, error: "Data da sessão inválida." };
  }
  const parsed = new Date(`${input}T00:00:00`);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Data da sessão inválida." };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed.getTime() < today.getTime()) {
    return { ok: false, error: "Data da sessão não pode ser no passado." };
  }
  return { ok: true, value: input };
}

// Mesma validação, mas aceita data passada — usado no PATCH (corrigir histórico).
export function parseSessaoDataAceitaPassado(input: unknown): Parsed<string> {
  if (typeof input !== "string" || input === "") {
    return { ok: false, error: "Data da sessão é obrigatória." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false, error: "Data da sessão inválida." };
  }
  const parsed = new Date(`${input}T00:00:00`);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Data da sessão inválida." };
  }
  return { ok: true, value: input };
}

export function parseTotalVagas(input: unknown): Parsed<number> {
  if (typeof input !== "number" || !Number.isInteger(input)) {
    return { ok: false, error: "Total de vagas inválido. Use inteiro." };
  }
  if (input < 1) {
    return { ok: false, error: "Total de vagas deve ser pelo menos 1." };
  }
  return { ok: true, value: input };
}

export function parseSessaoStatus(input: unknown): Parsed<StatusSessao> {
  if (typeof input !== "string" || !STATUS_VALIDOS.includes(input as StatusSessao)) {
    return { ok: false, error: "Status de sessão inválido." };
  }
  return { ok: true, value: input as StatusSessao };
}

type SessaoRow = typeof schema.corujaoSessoes.$inferSelect;
function serializeSessao(row: SessaoRow, vagasVendidas: number) {
  return {
    id: row.id,
    data: row.data,
    totalVagas: row.totalVagas,
    status: row.status,
    observacoes: row.observacoes ?? null,
    vagasVendidas,
    vagasRestantes: Math.max(0, row.totalVagas - vagasVendidas),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// Pega contagem de visitas agrupada por sessao_id pra um conjunto de ids.
async function fetchVagasVendidas(
  db: ReturnType<typeof getCheckoutDb>,
  sessaoIds: number[]
): Promise<Map<number, number>> {
  if (sessaoIds.length === 0) return new Map();
  const rows = await db
    .select({
      sessaoId: schema.corujaoVisitas.sessaoId,
      total: count()
    })
    .from(schema.corujaoVisitas)
    .where(inArray(schema.corujaoVisitas.sessaoId, sessaoIds))
    .groupBy(schema.corujaoVisitas.sessaoId);
  const map = new Map<number, number>();
  for (const row of rows) {
    if (row.sessaoId !== null) map.set(row.sessaoId, row.total);
  }
  return map;
}

export async function listSessoes(req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const futurasOnly = req.query.futuras === "true";

    const today = new Date().toISOString().slice(0, 10);
    const whereClause = futurasOnly ? gte(schema.corujaoSessoes.data, today) : undefined;
    const orderByClause = futurasOnly
      ? [asc(schema.corujaoSessoes.data), asc(schema.corujaoSessoes.id)]
      : [desc(schema.corujaoSessoes.data), desc(schema.corujaoSessoes.id)];

    const sessoes = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(whereClause)
      .orderBy(...orderByClause);

    const vagasMap = await fetchVagasVendidas(
      db,
      sessoes.map((s) => s.id)
    );

    return res.json({
      sessoes: sessoes.map((s) => serializeSessao(s, vagasMap.get(s.id) ?? 0))
    });
  } catch (error) {
    console.error("[corujao] listSessoes error:", error);
    return res.status(500).json({ message: "Erro ao listar sessões." });
  }
}

export async function getProximaSessao(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const today = new Date().toISOString().slice(0, 10);

    const [sessao] = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(
        and(
          gte(schema.corujaoSessoes.data, today),
          inArray(schema.corujaoSessoes.status, ["planejado", "aberto", "lotado"])
        )
      )
      .orderBy(asc(schema.corujaoSessoes.data), asc(schema.corujaoSessoes.id))
      .limit(1);

    if (!sessao) return res.json({ sessao: null });

    const vagasMap = await fetchVagasVendidas(db, [sessao.id]);
    return res.json({ sessao: serializeSessao(sessao, vagasMap.get(sessao.id) ?? 0) });
  } catch (error) {
    console.error("[corujao] getProximaSessao error:", error);
    return res.status(500).json({ message: "Erro ao buscar próxima sessão." });
  }
}

export async function createSessao(req: Request, res: Response) {
  try {
    const { data, totalVagas, status, observacoes } = req.body as {
      data?: unknown;
      totalVagas?: unknown;
      status?: unknown;
      observacoes?: string | null;
    };

    const dataParsed = parseSessaoData(data);
    if (!dataParsed.ok) return res.status(400).json({ message: dataParsed.error });

    let totalVagasVal = 10;
    if (totalVagas !== undefined && totalVagas !== null) {
      const parsed = parseTotalVagas(totalVagas);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      totalVagasVal = parsed.value;
    }

    let statusVal: StatusSessao = "planejado";
    if (status !== undefined && status !== null && status !== "") {
      const parsed = parseSessaoStatus(status);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      statusVal = parsed.value;
    }

    const observacoesValue =
      typeof observacoes === "string" && observacoes.trim().length > 0
        ? observacoes.trim()
        : null;

    const db = getCheckoutDb();
    const [sessao] = await db
      .insert(schema.corujaoSessoes)
      .values({
        data: dataParsed.value,
        totalVagas: totalVagasVal,
        status: statusVal,
        observacoes: observacoesValue
      })
      .returning();

    return res.status(201).json({ sessao: serializeSessao(sessao!, 0) });
  } catch (error) {
    console.error("[corujao] createSessao error:", error);
    return res.status(500).json({ message: "Erro ao criar sessão." });
  }
}

export async function updateSessao(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const { data, totalVagas, status, observacoes } = req.body as {
      data?: unknown;
      totalVagas?: unknown;
      status?: unknown;
      observacoes?: string | null;
    };

    const updates: Partial<typeof schema.corujaoSessoes.$inferInsert> = {
      updatedAt: new Date()
    };

    if (data !== undefined) {
      // PATCH aceita data passada (corrigir histórico de sessão já realizada).
      const parsed = parseSessaoDataAceitaPassado(data);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.data = parsed.value;
    }

    if (status !== undefined) {
      const parsed = parseSessaoStatus(status);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      updates.status = parsed.value;
    }

    if (observacoes !== undefined) {
      updates.observacoes =
        typeof observacoes === "string" && observacoes.trim().length > 0
          ? observacoes.trim()
          : null;
    }

    let novoTotalVagas: number | undefined;
    if (totalVagas !== undefined) {
      const parsed = parseTotalVagas(totalVagas);
      if (!parsed.ok) return res.status(400).json({ message: parsed.error });
      novoTotalVagas = parsed.value;
    }

    const db = getCheckoutDb();

    // Reduzir totalVagas abaixo das vendidas é bloqueado. SELECT count +
    // UPDATE numa transação evita race entre validação e update.
    const result = await db.transaction(async (tx) => {
      if (novoTotalVagas !== undefined) {
        const [vagasRow] = await tx
          .select({ value: count() })
          .from(schema.corujaoVisitas)
          .where(eq(schema.corujaoVisitas.sessaoId, id));
        const vendidas = vagasRow?.value ?? 0;
        if (novoTotalVagas < vendidas) {
          return {
            ok: false as const,
            message: `Não dá pra reduzir vagas abaixo das já vendidas (${vendidas}).`
          };
        }
        updates.totalVagas = novoTotalVagas;
      }

      const [sessao] = await tx
        .update(schema.corujaoSessoes)
        .set(updates)
        .where(eq(schema.corujaoSessoes.id, id))
        .returning();

      if (!sessao) {
        return { ok: false as const, message: "Sessão não encontrada.", status: 404 as const };
      }

      const [vagasRow] = await tx
        .select({ value: count() })
        .from(schema.corujaoVisitas)
        .where(eq(schema.corujaoVisitas.sessaoId, id));
      return { ok: true as const, sessao, vagasVendidas: vagasRow?.value ?? 0 };
    });

    if (!result.ok) {
      return res.status(result.status ?? 400).json({ message: result.message });
    }

    return res.json({ sessao: serializeSessao(result.sessao, result.vagasVendidas) });
  } catch (error) {
    console.error("[corujao] updateSessao error:", error);
    return res.status(500).json({ message: "Erro ao atualizar sessão." });
  }
}

export async function deleteSessao(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const db = getCheckoutDb();

    // Conta visitas amarradas ANTES do DELETE (apenas informativo —
    // serve pra UI mostrar quantas visitas viraram avulsas no toast).
    // A FK do schema (ON DELETE SET NULL) cuida da desvinculação.
    const [vagasRow] = await db
      .select({ value: count() })
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.sessaoId, id));
    const visitasOrfanizadas = vagasRow?.value ?? 0;

    const result = await db
      .delete(schema.corujaoSessoes)
      .where(eq(schema.corujaoSessoes.id, id))
      .returning({ id: schema.corujaoSessoes.id });

    if (result.length === 0) {
      return res.status(404).json({ message: "Sessão não encontrada." });
    }

    return res.json({ deletedId: id, visitasOrfanizadas });
  } catch (error) {
    console.error("[corujao] deleteSessao error:", error);
    return res.status(500).json({ message: "Erro ao apagar sessão." });
  }
}

// Usado pelo controller de visitas pra validar sessaoId antes do INSERT.
// Se for retornado null, o caller decide o que fazer (geralmente 404).
export async function findSessaoById(id: number): Promise<SessaoRow | null> {
  const db = getCheckoutDb();
  const [sessao] = await db
    .select()
    .from(schema.corujaoSessoes)
    .where(eq(schema.corujaoSessoes.id, id))
    .limit(1);
  return sessao ?? null;
}

