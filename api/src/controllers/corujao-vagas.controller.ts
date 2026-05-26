import { and, asc, eq, gte, inArray } from "drizzle-orm";
import type { Request, Response } from "express";
import { getCheckoutDb, schema } from "../db/index";
import { addClient, broadcast, getVagasPayload } from "../lib/vagas-sse";

export async function getVagas(_req: Request, res: Response) {
  try {
    const data = await getVagasPayload();
    return res.json(data);
  } catch (error) {
    console.error("[corujao] getVagas error:", error);
    return res.status(500).json({ message: "Erro ao buscar vagas." });
  }
}

export function streamVagas(_req: Request, res: Response) {
  addClient(res);
}

export async function descontarVaga(req: Request, res: Response) {
  try {
    const secret = req.headers["x-internal-secret"];
    if (!secret || secret !== process.env.CORUJAO_INTERNAL_SECRET) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { orderId, userId, amountCents } = req.body as {
      orderId?: number;
      userId?: number;
      amountCents?: number;
    };

    if (!orderId || !userId) {
      return res.status(400).json({ message: "orderId e userId obrigatórios." });
    }

    const db = getCheckoutDb();
    const today = new Date().toISOString().slice(0, 10);

    const [sessao] = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(
        and(
          gte(schema.corujaoSessoes.data, today),
          inArray(schema.corujaoSessoes.status, ["planejado", "aberto"])
        )
      )
      .orderBy(asc(schema.corujaoSessoes.data), asc(schema.corujaoSessoes.id))
      .limit(1);

    if (!sessao) {
      return res.status(404).json({ message: "Nenhuma sessão aberta." });
    }

    // Verifica se já existe visita com esse orderId (idempotência)
    const [existing] = await db
      .select({ id: schema.corujaoVisitas.id })
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.checkoutOrderId, orderId))
      .limit(1);

    if (existing) {
      return res.json({ message: "Vaga já descontada.", visitaId: existing.id });
    }

    // Busca ou cria contato pelo checkout_user_id
    let [contato] = await db
      .select()
      .from(schema.corujaoContatos)
      .where(eq(schema.corujaoContatos.checkoutUserId, userId))
      .limit(1);

    if (!contato) {
      [contato] = await db
        .insert(schema.corujaoContatos)
        .values({
          checkoutUserId: userId,
          origem: "espontaneo" as const
        })
        .returning();
    }

    const [visita] = await db
      .insert(schema.corujaoVisitas)
      .values({
        contatoId: contato!.id,
        sessaoId: sessao.id,
        dataVisita: sessao.data,
        amountCents: amountCents ?? 0,
        formaPagamento: "gateway" as const,
        checkoutOrderId: orderId
      })
      .returning();

    await broadcast();

    return res.json({ message: "Vaga descontada.", visitaId: visita!.id });
  } catch (error) {
    console.error("[corujao] descontarVaga error:", error);
    return res.status(500).json({ message: "Erro ao descontar vaga." });
  }
}

export async function ajustarVagas(req: Request, res: Response) {
  try {
    const { sessaoId, delta, motivo } = req.body as {
      sessaoId?: number;
      delta?: number;
      motivo?: string;
    };

    if (!sessaoId || !delta || !Number.isInteger(delta)) {
      return res.status(400).json({ message: "sessaoId e delta obrigatórios." });
    }

    const db = getCheckoutDb();

    const [sessao] = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(eq(schema.corujaoSessoes.id, sessaoId))
      .limit(1);

    if (!sessao) {
      return res.status(404).json({ message: "Sessão não encontrada." });
    }

    const novoTotal = sessao.totalVagas + delta;
    if (novoTotal < 0) {
      return res.status(400).json({ message: "Total de vagas não pode ser negativo." });
    }

    await db
      .update(schema.corujaoSessoes)
      .set({ totalVagas: novoTotal, updatedAt: new Date() })
      .where(eq(schema.corujaoSessoes.id, sessaoId));

    if (motivo) {
      console.log(`[corujao] vagas ajustadas: sessao=${sessaoId} delta=${delta} motivo="${motivo}"`);
    }

    await broadcast();

    return res.json({ message: "Vagas ajustadas.", totalVagas: novoTotal });
  } catch (error) {
    console.error("[corujao] ajustarVagas error:", error);
    return res.status(500).json({ message: "Erro ao ajustar vagas." });
  }
}
