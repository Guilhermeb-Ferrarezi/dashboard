import { and, count, eq, notInArray } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getCheckoutDb, schema } from "../db/index";

export async function listSessoes(c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();

    const sessoes = await db
      .select()
      .from(schema.mixSessoes)
      .where(notInArray(schema.mixSessoes.status, ["realizado", "cancelado"]))
      .orderBy(schema.mixSessoes.dataPrevista, schema.mixSessoes.id);

    if (sessoes.length === 0) {
      return c.json({ sessoes: [] });
    }

    const contagens = await db
      .select({
        sessaoId: schema.mixInscricoes.sessaoId,
        total: count()
      })
      .from(schema.mixInscricoes)
      .where(eq(schema.mixInscricoes.status, "confirmado"))
      .groupBy(schema.mixInscricoes.sessaoId);

    const vagasMap = new Map(contagens.map((r) => [r.sessaoId, r.total]));

    return c.json({
      sessoes: sessoes.map((s) => ({
        id: s.id,
        jogo: s.jogo,
        dataPrevista: s.dataPrevista,
        horario: s.horario,
        modalidade: s.modalidade,
        totalVagas: s.totalVagas,
        vagasPreenchidas: vagasMap.get(s.id) ?? 0,
        status: s.status,
        precoCents: s.precoCents
      }))
    });
  } catch (error) {
    console.error("[mix] listSessoes error:", error);
    return c.json({ message: "Erro ao listar sessões de mix." }, 500);
  }
}
