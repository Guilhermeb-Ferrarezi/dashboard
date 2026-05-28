import { count, desc, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { getCheckoutDb, schema } from "../db/index";
import { broadcast } from "../lib/vagas-sse";

const FORMAS_PAGAMENTO_VALIDAS = [
  "pix",
  "dinheiro",
  "cartao",
  "gateway",
  "cortesia",
  "outro"
] as const;
type FormaPagamento = (typeof FORMAS_PAGAMENTO_VALIDAS)[number];

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// Aceita "YYYY-MM-DD" não-futura. Hoje é OK; só amanhã+ rejeita.
export function parseVisitaDate(input: unknown): Parsed<string> {
  if (typeof input !== "string" || input === "") {
    return { ok: false, error: "Data da visita é obrigatória." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false, error: "Data da visita inválida." };
  }
  const parsed = new Date(`${input}T00:00:00`);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Data da visita inválida." };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed.getTime() > today.getTime()) {
    return { ok: false, error: "Data da visita não pode ser no futuro." };
  }
  return { ok: true, value: input };
}

export function parseFormaPagamento(input: unknown): Parsed<FormaPagamento> {
  if (typeof input !== "string" || !FORMAS_PAGAMENTO_VALIDAS.includes(input as FormaPagamento)) {
    return { ok: false, error: "Forma de pagamento inválida." };
  }
  return { ok: true, value: input as FormaPagamento };
}

// `amountCents` precisa ser inteiro >= 0. 0 só vale quando forma = cortesia.
// Forma errada com valor 0 é erro porque corrompe relatório: visita "PIX 0,00"
// não existe — quem deu errado na hora prefere ver erro explícito.
export function parseVisitaAmount(
  rawAmount: unknown,
  forma: FormaPagamento
): Parsed<number> {
  if (typeof rawAmount !== "number" || !Number.isFinite(rawAmount) || !Number.isInteger(rawAmount)) {
    return { ok: false, error: "Valor da visita inválido. Envie o valor em centavos (inteiro)." };
  }
  if (rawAmount < 0) {
    return { ok: false, error: "Valor da visita não pode ser negativo." };
  }
  if (rawAmount === 0 && forma !== "cortesia") {
    return {
      ok: false,
      error: "Valor 0 só é permitido quando a forma de pagamento é Cortesia."
    };
  }
  return { ok: true, value: rawAmount };
}

function serializeVisita(row: typeof schema.corujaoVisitas.$inferSelect) {
  return {
    id: row.id,
    contatoId: row.contatoId,
    sessaoId: row.sessaoId ?? null,
    colaboradorId: row.colaboradorId ?? null,
    dataVisita: row.dataVisita,
    amountCents: row.amountCents,
    formaPagamento: row.formaPagamento,
    checkoutOrderId: row.checkoutOrderId ?? null,
    observacoes: row.observacoes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
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

export async function createVisita(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const {
      contatoId: rawContatoId,
      sessaoId: rawSessaoId,
      colaboradorId: rawColaboradorId,
      dataVisita: rawDataVisita,
      amountCents: rawAmountCents,
      formaPagamento: rawFormaPagamento,
      observacoes
    } = body as {
      contatoId?: unknown;
      sessaoId?: unknown;
      colaboradorId?: unknown;
      dataVisita?: unknown;
      amountCents?: unknown;
      formaPagamento?: unknown;
      observacoes?: string | null;
    };

    const contatoId = Number(rawContatoId);
    if (!Number.isInteger(contatoId) || contatoId <= 0) {
      return c.json({ message: "contatoId inválido." }, 400);
    }

    // sessaoId é opcional. Se vier, precisa ser inteiro positivo — a FK
    // do schema dispara 23503 se a sessão não existir, e o catch já mapeia.
    let sessaoId: number | null = null;
    if (rawSessaoId !== undefined && rawSessaoId !== null && rawSessaoId !== "") {
      const parsed = Number(rawSessaoId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return c.json({ message: "sessaoId inválido." }, 400);
      }
      sessaoId = parsed;
    }

    let colaboradorId: number | null = null;
    if (rawColaboradorId !== undefined && rawColaboradorId !== null && rawColaboradorId !== "") {
      const parsed = Number(rawColaboradorId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return c.json({ message: "colaboradorId inválido." }, 400);
      }
      colaboradorId = parsed;
    }

    const dataParsed = parseVisitaDate(rawDataVisita);
    if (!dataParsed.ok) return c.json({ message: dataParsed.error }, 400);

    const formaParsed = parseFormaPagamento(rawFormaPagamento);
    if (!formaParsed.ok) return c.json({ message: formaParsed.error }, 400);

    const amountParsed = parseVisitaAmount(rawAmountCents, formaParsed.value);
    if (!amountParsed.ok) return c.json({ message: amountParsed.error }, 400);

    const observacoesValue =
      typeof observacoes === "string" && observacoes.trim().length > 0
        ? observacoes.trim()
        : null;

    const db = getCheckoutDb();

    // Transação: INSERT visita + UPDATE ja_participou=true. Se algo falhar,
    // rollback evita ja_participou marcado sem visita correspondente.
    const result = await db.transaction(async (tx) => {
      const [visita] = await tx
        .insert(schema.corujaoVisitas)
        .values({
          contatoId,
          sessaoId,
          colaboradorId,
          dataVisita: dataParsed.value,
          amountCents: amountParsed.value,
          formaPagamento: formaParsed.value,
          observacoes: observacoesValue
        })
        .returning();

      const [contato] = await tx
        .update(schema.corujaoContatos)
        .set({ jaParticipou: true, updatedAt: new Date() })
        .where(eq(schema.corujaoContatos.id, contatoId))
        .returning();

      return { visita, contato };
    });

    if (!result.contato) {
      // Inserção da visita rolou mas o contato não existia → o FK do
      // contato_id em corujao_visitas tem onDelete:cascade, mas inserir
      // contra contatoId inexistente já dispara 23503 no INSERT. Este
      // branch é defesa em profundidade caso a transação seja alterada.
      return c.json({ message: "Contato não encontrado." }, 404);
    }

    broadcast().catch(() => {});

    return c.json({
      visita: serializeVisita(result.visita!),
      contato: serializeContato(result.contato)
    }, 201);
  } catch (error: unknown) {
    const pgError = error as { code?: string; constraint_name?: string };
    if (pgError.code === "23503") {
      const constraint = pgError.constraint_name ?? "";
      if (constraint.includes("sessao")) {
        return c.json({ message: "Sessão não encontrada." }, 404);
      }
      if (constraint.includes("colaborador")) {
        return c.json({ message: "Colaborador não encontrado." }, 404);
      }
      return c.json({ message: "Contato não encontrado." }, 404);
    }
    console.error("[corujao] createVisita error:", error);
    return c.json({ message: "Erro ao registrar visita." }, 500);
  }
}

export async function updateVisita(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ message: "ID inválido." }, 400);
    }

    const body = await c.req.json();
    const {
      sessaoId: rawSessaoId,
      colaboradorId: rawColaboradorId,
      dataVisita: rawDataVisita,
      amountCents: rawAmountCents,
      formaPagamento: rawFormaPagamento,
      observacoes
    } = body as {
      sessaoId?: unknown;
      colaboradorId?: unknown;
      dataVisita?: unknown;
      amountCents?: unknown;
      formaPagamento?: unknown;
      observacoes?: string | null;
    };

    const updates: Partial<typeof schema.corujaoVisitas.$inferInsert> = {
      updatedAt: new Date()
    };

    if (rawSessaoId !== undefined) {
      if (rawSessaoId === null || rawSessaoId === "") {
        updates.sessaoId = null;
      } else {
        const parsed = Number(rawSessaoId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return c.json({ message: "sessaoId inválido." }, 400);
        }
        updates.sessaoId = parsed;
      }
    }

    if (rawColaboradorId !== undefined) {
      if (rawColaboradorId === null || rawColaboradorId === "") {
        updates.colaboradorId = null;
      } else {
        const parsed = Number(rawColaboradorId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return c.json({ message: "colaboradorId inválido." }, 400);
        }
        updates.colaboradorId = parsed;
      }
    }

    if (rawDataVisita !== undefined) {
      const parsed = parseVisitaDate(rawDataVisita);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.dataVisita = parsed.value;
    }

    if (rawFormaPagamento !== undefined) {
      const parsed = parseFormaPagamento(rawFormaPagamento);
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.formaPagamento = parsed.value;
    }

    if (rawAmountCents !== undefined) {
      // Validamos contra a forma final (se mudou no PATCH ou a antiga).
      const formaFinal = updates.formaPagamento ?? null;
      // Sem forma_pagamento definida no PATCH: aceitamos amount mesmo
      // (FK do schema mantém consistência; validação rigorosa de 0+forma
      // só faz sentido no fluxo de criação).
      const parsed = parseVisitaAmount(
        rawAmountCents,
        formaFinal ?? "pix" // fallback inócuo: se for 0+forma!=cortesia, rejeita.
      );
      if (!parsed.ok) return c.json({ message: parsed.error }, 400);
      updates.amountCents = parsed.value;
    }

    if (observacoes !== undefined) {
      updates.observacoes =
        typeof observacoes === "string" && observacoes.trim().length > 0
          ? observacoes.trim()
          : null;
    }

    const db = getCheckoutDb();
    const [visita] = await db
      .update(schema.corujaoVisitas)
      .set(updates)
      .where(eq(schema.corujaoVisitas.id, id))
      .returning();

    if (!visita) return c.json({ message: "Visita não encontrada." }, 404);

    return c.json({ visita: serializeVisita(visita) });
  } catch (error: unknown) {
    const pgError = error as { code?: string; constraint_name?: string };
    if (pgError.code === "23503") {
      const constraint = pgError.constraint_name ?? "";
      if (constraint.includes("sessao")) {
        return c.json({ message: "Sessão não encontrada." }, 404);
      }
      if (constraint.includes("colaborador")) {
        return c.json({ message: "Colaborador não encontrado." }, 404);
      }
    }
    console.error("[corujao] updateVisita error:", error);
    return c.json({ message: "Erro ao atualizar visita." }, 500);
  }
}

export async function listVisitasBySessao(c: Context<AppEnv>): Promise<Response> {
  try {
    const sessaoId = Number(c.req.param("id"));
    if (!Number.isInteger(sessaoId) || sessaoId <= 0) {
      return c.json({ message: "sessaoId inválido." }, 400);
    }

    const db = getCheckoutDb();
    const visitas = await db
      .select()
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.sessaoId, sessaoId))
      .orderBy(desc(schema.corujaoVisitas.createdAt));

    const contatoIds = [...new Set(visitas.map((v) => v.contatoId))];
    const contatos = contatoIds.length > 0
      ? await db.select().from(schema.corujaoContatos).where(inArray(schema.corujaoContatos.id, contatoIds))
      : [];

    const contatoMap = new Map(contatos.map((c) => [c.id, c]));

    const customerUserIds = contatos.map((c) => c.checkoutUserId).filter((id): id is number => id !== null);
    const customers = customerUserIds.length > 0
      ? await db.select().from(schema.checkoutCustomers).where(inArray(schema.checkoutCustomers.userId, customerUserIds))
      : [];

    const customerMap = new Map(customers.map((c) => [c.userId, c]));

    const result = visitas.map((v) => {
      const contato = contatoMap.get(v.contatoId);
      const customer = contato?.checkoutUserId ? customerMap.get(contato.checkoutUserId) : null;
      return {
        ...serializeVisita(v),
        contato: contato ? {
          nome: contato.nome ?? customer?.name ?? null,
          telefone: contato.telefone ?? customer?.cellphone ?? null,
          email: contato.email ?? customer?.userEmail ?? null
        } : null
      };
    });

    return c.json({ visitas: result });
  } catch (error) {
    console.error("[corujao] listVisitasBySessao error:", error);
    return c.json({ message: "Erro ao listar visitas da sessão." }, 500);
  }
}

export async function listVisitasByContato(c: Context<AppEnv>): Promise<Response> {
  try {
    const contatoId = Number(c.req.param("id"));
    if (!Number.isInteger(contatoId) || contatoId <= 0) {
      return c.json({ message: "contatoId inválido." }, 400);
    }

    const db = getCheckoutDb();
    const rows = await db
      .select()
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.contatoId, contatoId))
      .orderBy(desc(schema.corujaoVisitas.dataVisita), desc(schema.corujaoVisitas.id));

    return c.json({ visitas: rows.map(serializeVisita) });
  } catch (error) {
    console.error("[corujao] listVisitasByContato error:", error);
    return c.json({ message: "Erro ao listar visitas." }, 500);
  }
}

export async function deleteVisita(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ message: "ID inválido." }, 400);
    }

    const db = getCheckoutDb();

    // Transação: pega contatoId/sessaoId, deleta, recalc ja_participou.
    // Se a visita era a única do contato, ja_participou volta a false.
    const result = await db.transaction(async (tx) => {
      const [visita] = await tx
        .select()
        .from(schema.corujaoVisitas)
        .where(eq(schema.corujaoVisitas.id, id))
        .limit(1);

      if (!visita) {
        return { ok: false as const, message: "Visita não encontrada.", status: 404 as const };
      }

      await tx.delete(schema.corujaoVisitas).where(eq(schema.corujaoVisitas.id, id));

      const [remaining] = await tx
        .select({ value: count() })
        .from(schema.corujaoVisitas)
        .where(eq(schema.corujaoVisitas.contatoId, visita.contatoId));

      const newJaParticipou = (remaining?.value ?? 0) > 0;

      const [contato] = await tx
        .update(schema.corujaoContatos)
        .set({ jaParticipou: newJaParticipou, updatedAt: new Date() })
        .where(eq(schema.corujaoContatos.id, visita.contatoId))
        .returning();

      return {
        ok: true as const,
        contato,
        sessaoId: visita.sessaoId ?? null,
        visitaDeletadaId: id
      };
    });

    if (!result.ok) {
      return c.json({ message: result.message }, result.status);
    }

    if (!result.contato) {
      // Contato sumiu entre o SELECT da visita e o UPDATE — caso degenerado.
      return c.json({ contato: null, sessaoId: result.sessaoId, visitaDeletadaId: result.visitaDeletadaId });
    }

    broadcast().catch(() => {});

    return c.json({
      contato: serializeContato(result.contato),
      sessaoId: result.sessaoId,
      visitaDeletadaId: result.visitaDeletadaId
    });
  } catch (error) {
    console.error("[corujao] deleteVisita error:", error);
    return c.json({ message: "Erro ao cancelar visita." }, 500);
  }
}
