import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type Periodo = {
  // Inclusivo nos dois lados. "YYYY-MM-DD" pra casar com colunas date.
  from: string;
  to: string;
  label: string;
};

// Hoje no formato YYYY-MM-DD (TZ do servidor — documentado).
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Primeiro dia do mês corrente em YYYY-MM-DD.
function firstDayOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// 7 dias atrás (inclusivo) em YYYY-MM-DD.
function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6); // hoje - 6 = 7 dias contando hoje
  return d.toISOString().slice(0, 10);
}

// "todos" usa 1970 como lower bound — escapa do filtro sem precisar de
// branch separado nas queries.
const EPOCH_DATE = "1970-01-01";

export function parsePeriodo(query: Request["query"]): Parsed<Periodo> {
  const periodo = String(query.periodo ?? "mes");

  if (periodo === "mes") {
    return {
      ok: true,
      value: {
        from: firstDayOfMonthISO(),
        to: todayISO(),
        label: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      }
    };
  }

  if (periodo === "semana") {
    return {
      ok: true,
      value: { from: sevenDaysAgoISO(), to: todayISO(), label: "Últimos 7 dias" }
    };
  }

  if (periodo === "todos") {
    return { ok: true, value: { from: EPOCH_DATE, to: todayISO(), label: "Todo período" } };
  }

  if (periodo === "custom") {
    const from = typeof query.from === "string" ? query.from : "";
    const to = typeof query.to === "string" ? query.to : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return { ok: false, error: "Datas custom obrigatórias: from e to (YYYY-MM-DD)." };
    }
    if (from > to) {
      return { ok: false, error: "Data inicial não pode ser maior que a final." };
    }
    return { ok: true, value: { from, to, label: `${from} a ${to}` } };
  }

  return { ok: false, error: "Período inválido. Use mes, semana, todos ou custom." };
}

export async function getPainel(req: Request, res: Response) {
  try {
    const periodoParsed = parsePeriodo(req.query);
    if (!periodoParsed.ok) {
      return res.status(400).json({ message: periodoParsed.error });
    }
    const { from, to, label } = periodoParsed.value;

    const db = getCheckoutDb();

    // ── Visitas do período (base de receita + vendas) ──────────────────────
    // Cortesia conta vaga ocupada mas não receita: somamos amount_cents só
    // quando forma_pagamento != 'cortesia'.
    const [totaisRow] = await db
      .select({
        vendasCount: sql<number>`COUNT(*)::int`,
        receitaCents: sql<number>`COALESCE(SUM(CASE WHEN ${schema.corujaoVisitas.formaPagamento} <> 'cortesia' THEN ${schema.corujaoVisitas.amountCents} ELSE 0 END), 0)::int`
      })
      .from(schema.corujaoVisitas)
      .where(
        and(
          gte(schema.corujaoVisitas.dataVisita, from),
          lte(schema.corujaoVisitas.dataVisita, to)
        )
      );

    const vendasCount = totaisRow?.vendasCount ?? 0;
    const receitaCents = totaisRow?.receitaCents ?? 0;
    const ticketMedioCents =
      vendasCount > 0 ? Math.round(receitaCents / vendasCount) : 0;

    // ── Sessões do período (não-canceladas pra meta) ───────────────────────
    const sessoesValidasRows = await db
      .select({
        id: schema.corujaoSessoes.id,
        data: schema.corujaoSessoes.data,
        totalVagas: schema.corujaoSessoes.totalVagas,
        status: schema.corujaoSessoes.status
      })
      .from(schema.corujaoSessoes)
      .where(
        and(
          gte(schema.corujaoSessoes.data, from),
          lte(schema.corujaoSessoes.data, to),
          ne(schema.corujaoSessoes.status, "cancelado")
        )
      );

    const sessoesRealizadas = sessoesValidasRows.length;
    const vagasOfertadas = sessoesValidasRows.reduce((sum, s) => sum + s.totalVagas, 0);

    // Visitas com sessao_id no período (= vagas efetivamente ocupadas).
    const [vagasOcupadasRow] = await db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(schema.corujaoVisitas)
      .where(
        and(
          gte(schema.corujaoVisitas.dataVisita, from),
          lte(schema.corujaoVisitas.dataVisita, to),
          sql`${schema.corujaoVisitas.sessaoId} IS NOT NULL`
        )
      );
    const vagasOcupadas = vagasOcupadasRow?.value ?? 0;
    const taxaOcupacao =
      vagasOfertadas > 0 ? Math.round((vagasOcupadas / vagasOfertadas) * 1000) / 1000 : 0;

    // ── Por colaborador (LEFT JOIN pra incluir "sem atribuição") ───────────
    const porColaboradorRows = await db
      .select({
        colaboradorId: schema.corujaoVisitas.colaboradorId,
        nome: schema.colaboradores.nome,
        vendas: sql<number>`COUNT(*)::int`,
        receitaCents: sql<number>`COALESCE(SUM(CASE WHEN ${schema.corujaoVisitas.formaPagamento} <> 'cortesia' THEN ${schema.corujaoVisitas.amountCents} ELSE 0 END), 0)::int`
      })
      .from(schema.corujaoVisitas)
      .leftJoin(
        schema.colaboradores,
        eq(schema.colaboradores.id, schema.corujaoVisitas.colaboradorId)
      )
      .where(
        and(
          gte(schema.corujaoVisitas.dataVisita, from),
          lte(schema.corujaoVisitas.dataVisita, to)
        )
      )
      .groupBy(schema.corujaoVisitas.colaboradorId, schema.colaboradores.nome)
      .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${schema.corujaoVisitas.formaPagamento} <> 'cortesia' THEN ${schema.corujaoVisitas.amountCents} ELSE 0 END), 0)`));

    const porColaborador = porColaboradorRows.map((r) => ({
      id: r.colaboradorId ?? null,
      nome: r.nome ?? "(sem atribuição)",
      vendas: r.vendas,
      receitaCents: r.receitaCents
    }));

    // ── Sessões com receita + ocupação (tabela do bloco 3) ─────────────────
    // Pra cada sessão valida, count + sum das visitas dela.
    const sessoesNoPeriodoRows = await db
      .select({
        id: schema.corujaoSessoes.id,
        data: schema.corujaoSessoes.data,
        status: schema.corujaoSessoes.status,
        totalVagas: schema.corujaoSessoes.totalVagas,
        observacoes: schema.corujaoSessoes.observacoes,
        vagasOcupadas: sql<number>`COALESCE(COUNT(${schema.corujaoVisitas.id}), 0)::int`,
        receitaCents: sql<number>`COALESCE(SUM(CASE WHEN ${schema.corujaoVisitas.formaPagamento} <> 'cortesia' THEN ${schema.corujaoVisitas.amountCents} ELSE 0 END), 0)::int`
      })
      .from(schema.corujaoSessoes)
      .leftJoin(
        schema.corujaoVisitas,
        eq(schema.corujaoVisitas.sessaoId, schema.corujaoSessoes.id)
      )
      .where(
        and(
          gte(schema.corujaoSessoes.data, from),
          lte(schema.corujaoSessoes.data, to)
        )
      )
      .groupBy(
        schema.corujaoSessoes.id,
        schema.corujaoSessoes.data,
        schema.corujaoSessoes.status,
        schema.corujaoSessoes.totalVagas,
        schema.corujaoSessoes.observacoes
      )
      .orderBy(desc(schema.corujaoSessoes.data), desc(schema.corujaoSessoes.id))
      .limit(100);

    const sessoesNoPeriodo = sessoesNoPeriodoRows.map((s) => ({
      id: s.id,
      data: s.data,
      status: s.status,
      totalVagas: s.totalVagas,
      vagasOcupadas: s.vagasOcupadas,
      receitaCents: s.receitaCents,
      observacoes: s.observacoes ?? null
    }));

    return res.json({
      periodo: { from, to, label },
      totais: {
        vendasCount,
        receitaCents,
        ticketMedioCents,
        sessoesRealizadas,
        vagasOfertadas,
        vagasOcupadas,
        taxaOcupacao
      },
      porColaborador,
      sessoesNoPeriodo
    });
  } catch (error) {
    console.error("[corujao] getPainel error:", error);
    return res.status(500).json({ message: "Erro ao montar painel." });
  }
}

