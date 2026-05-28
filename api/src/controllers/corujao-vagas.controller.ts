import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "../types/hono";
import { getCheckoutDb, schema } from "../db/index";
import { addSseClient, broadcast, getVagasPayload } from "../lib/vagas-sse";

export async function getVagas(c: Context<AppEnv>): Promise<Response> {
  try {
    const data = await getVagasPayload();
    return c.json(data);
  } catch (error) {
    console.error("[corujao] getVagas error:", error);
    return c.json({ message: "Erro ao buscar vagas." }, 500);
  }
}

export function streamVagas(c: Context<AppEnv>): Response {
  return streamSSE(c, async (stream) => {
    addSseClient(
      {
        write: (data: string) => stream.write(data),
      },
      (fn) => stream.onAbort(fn),
    );
    // Keep the stream open — it closes when the client disconnects (onAbort).
    await new Promise<void>((resolve) => stream.onAbort(resolve));
  });
}

export async function descontarVaga(c: Context<AppEnv>): Promise<Response> {
  try {
    const secret = c.req.header("x-internal-secret");
    if (!secret || secret !== process.env.CORUJAO_INTERNAL_SECRET) {
      return c.json({ message: "Unauthorized." }, 401);
    }

    const body = await c.req.json();
    const { orderId, userId, amountCents } = body as {
      orderId?: number;
      userId?: number;
      amountCents?: number;
    };

    if (!orderId || !userId) {
      return c.json({ message: "orderId e userId obrigatórios." }, 400);
    }

    const db = getCheckoutDb();
    const today = new Date().toISOString().slice(0, 10);

    // Verifica se já existe visita com esse orderId (idempotência)
    const [existing] = await db
      .select({ id: schema.corujaoVisitas.id })
      .from(schema.corujaoVisitas)
      .where(eq(schema.corujaoVisitas.checkoutOrderId, orderId))
      .limit(1);

    if (existing) {
      return c.json({ message: "Vaga já descontada.", visitaId: existing.id });
    }

    // Busca sessões futuras ordenadas por data
    const sessoes = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(
        and(
          gte(schema.corujaoSessoes.data, today),
          inArray(schema.corujaoSessoes.status, ["planejado", "aberto", "lotado"])
        )
      )
      .orderBy(asc(schema.corujaoSessoes.data), asc(schema.corujaoSessoes.id));

    if (sessoes.length === 0) {
      return c.json({ message: "Nenhuma sessão disponível." }, 404);
    }

    // Conta visitas de cada sessão pra achar a primeira com vaga
    const vagasMap = new Map<number, number>();
    if (sessoes.length > 0) {
      const rows = await db
        .select({ sessaoId: schema.corujaoVisitas.sessaoId, total: count() })
        .from(schema.corujaoVisitas)
        .where(inArray(schema.corujaoVisitas.sessaoId, sessoes.map((s) => s.id)))
        .groupBy(schema.corujaoVisitas.sessaoId);
      for (const r of rows) {
        if (r.sessaoId !== null) vagasMap.set(r.sessaoId, r.total);
      }
    }

    const sessao = sessoes.find((s) => {
      const vendidas = vagasMap.get(s.id) ?? 0;
      return vendidas < s.totalVagas;
    });

    if (!sessao) {
      return c.json({ message: "Todas as sessões estão lotadas." }, 409);
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

    // Se lotou, marca como "lotado"
    const vendidas = (vagasMap.get(sessao.id) ?? 0) + 1;
    if (vendidas >= sessao.totalVagas) {
      await db
        .update(schema.corujaoSessoes)
        .set({ status: "lotado" as const, updatedAt: new Date() })
        .where(eq(schema.corujaoSessoes.id, sessao.id));
    }

    await broadcast();

    return c.json({ message: "Vaga descontada.", visitaId: visita!.id, sessaoId: sessao.id });
  } catch (error) {
    console.error("[corujao] descontarVaga error:", error);
    return c.json({ message: "Erro ao descontar vaga." }, 500);
  }
}

export async function ajustarVagas(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { sessaoId, delta, motivo } = body as {
      sessaoId?: number;
      delta?: number;
      motivo?: string;
    };

    if (!sessaoId || !delta || !Number.isInteger(delta)) {
      return c.json({ message: "sessaoId e delta obrigatórios." }, 400);
    }

    const db = getCheckoutDb();

    const [sessao] = await db
      .select()
      .from(schema.corujaoSessoes)
      .where(eq(schema.corujaoSessoes.id, sessaoId))
      .limit(1);

    if (!sessao) {
      return c.json({ message: "Sessão não encontrada." }, 404);
    }

    const novoTotal = sessao.totalVagas + delta;
    if (novoTotal < 0) {
      return c.json({ message: "Total de vagas não pode ser negativo." }, 400);
    }

    await db
      .update(schema.corujaoSessoes)
      .set({ totalVagas: novoTotal, updatedAt: new Date() })
      .where(eq(schema.corujaoSessoes.id, sessaoId));

    if (motivo) {
      console.log(`[corujao] vagas ajustadas: sessao=${sessaoId} delta=${delta} motivo="${motivo}"`);
    }

    await broadcast();

    return c.json({ message: "Vagas ajustadas.", totalVagas: novoTotal });
  } catch (error) {
    console.error("[corujao] ajustarVagas error:", error);
    return c.json({ message: "Erro ao ajustar vagas." }, 500);
  }
}
