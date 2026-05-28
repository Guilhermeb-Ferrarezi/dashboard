import { asc, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { getCheckoutDb, schema } from "../db/index";

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseColaboradorNome(input: unknown): Parsed<string> {
  if (typeof input !== "string") {
    return { ok: false, error: "Nome do colaborador é obrigatório." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Nome do colaborador é obrigatório." };
  }
  return { ok: true, value: trimmed };
}

// Gera um identificador único para colaboradores cadastrados manualmente —
// sem User correspondente no Mongo. Quando o sync com Mongo entrar
// (dívida #5), esses colaboradores continuam funcionando porque o prefixo
// "manual:" não colide com IDs reais do Mongo (que são ObjectIds em hex).
function generateManualMongoId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `manual:${Date.now()}-${random}`;
}

type ColaboradorRow = typeof schema.colaboradores.$inferSelect;
function serializeColaborador(row: ColaboradorRow) {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo,
    mongoId: row.mongoId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// Bootstrap silencioso: se o banco está vazio, cria "Henrique" automaticamente.
// Roda dentro do listColaboradores na primeira chamada — idempotente porque
// só dispara quando count === 0.
async function ensureBootstrap(
  db: ReturnType<typeof getCheckoutDb>
): Promise<void> {
  const existing = await db.select({ id: schema.colaboradores.id }).from(schema.colaboradores).limit(1);
  if (existing.length > 0) return;
  await db.insert(schema.colaboradores).values({
    nome: "Henrique",
    ativo: true,
    mongoId: generateManualMongoId()
  });
}

export async function listColaboradores(c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    await ensureBootstrap(db);

    const ativoFilter = c.req.query("ativo");
    let whereClause;
    if (ativoFilter === "true") whereClause = eq(schema.colaboradores.ativo, true);
    else if (ativoFilter === "false") whereClause = eq(schema.colaboradores.ativo, false);

    const colaboradores = await db
      .select()
      .from(schema.colaboradores)
      .where(whereClause)
      .orderBy(asc(schema.colaboradores.nome));

    return c.json({ colaboradores: colaboradores.map(serializeColaborador) });
  } catch (error) {
    console.error("[corujao] listColaboradores error:", error);
    return c.json({ message: "Erro ao listar colaboradores." }, 500);
  }
}

export async function createColaborador(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { nome, ativo } = body as { nome?: unknown; ativo?: unknown };

    const nomeParsed = parseColaboradorNome(nome);
    if (!nomeParsed.ok) return c.json({ message: nomeParsed.error }, 400);

    const ativoVal = typeof ativo === "boolean" ? ativo : true;

    const db = getCheckoutDb();
    const [colaborador] = await db
      .insert(schema.colaboradores)
      .values({
        nome: nomeParsed.value,
        ativo: ativoVal,
        mongoId: generateManualMongoId()
      })
      .returning();

    return c.json({ colaborador: serializeColaborador(colaborador!) }, 201);
  } catch (error) {
    console.error("[corujao] createColaborador error:", error);
    return c.json({ message: "Erro ao criar colaborador." }, 500);
  }
}

export async function updateColaborador(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ message: "ID inválido." }, 400);
    }

    const body = await c.req.json();
    const { nome, ativo } = body as { nome?: unknown; ativo?: unknown };

    const updates: Partial<typeof schema.colaboradores.$inferInsert> = {
      updatedAt: new Date()
    };

    if (nome !== undefined) {
      const parsed = parseColaboradorNome(nome);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.nome = parsed.value;
    }

    if (ativo !== undefined) {
      if (typeof ativo !== "boolean") {
        return c.json({ message: "Campo ativo deve ser true ou false." }, 400);
      }
      updates.ativo = ativo;
    }

    const db = getCheckoutDb();
    const [colaborador] = await db
      .update(schema.colaboradores)
      .set(updates)
      .where(eq(schema.colaboradores.id, id))
      .returning();

    if (!colaborador) return c.json({ message: "Colaborador não encontrado." }, 404);

    return c.json({ colaborador: serializeColaborador(colaborador) });
  } catch (error) {
    console.error("[corujao] updateColaborador error:", error);
    return c.json({ message: "Erro ao atualizar colaborador." }, 500);
  }
}
