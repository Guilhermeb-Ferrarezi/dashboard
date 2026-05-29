import { and, count, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getCheckoutDb, schema } from "../db/index";

const CHECKOUT_WEB_URL = process.env.CHECKOUT_WEB_URL || "";
const MIX_INTERNAL_SECRET = process.env.MIX_INTERNAL_SECRET || "";

export async function inscrever(c: Context<AppEnv>): Promise<Response> {
  try {
    const sessaoId = Number(c.req.param("id"));
    if (!sessaoId || isNaN(sessaoId)) {
      return c.json({ message: "ID de sessão inválido." }, 400);
    }

    const userId = parseInt(c.get("user").id, 10);
    if (isNaN(userId)) {
      return c.json({ message: "Usuário inválido." }, 400);
    }

    const db = getCheckoutDb();

    // Verifica se a sessão existe e está disponível
    const [sessao] = await db
      .select()
      .from(schema.mixSessoes)
      .where(eq(schema.mixSessoes.id, sessaoId))
      .limit(1);

    if (!sessao) {
      return c.json({ message: "Sessão não encontrada." }, 404);
    }

    if (sessao.status === "realizado" || sessao.status === "cancelado") {
      return c.json({ message: "Sessão não disponível para inscrição." }, 409);
    }

    // Garante que checkout_customer existe
    const [customer] = await db
      .select({ userId: schema.checkoutCustomers.userId })
      .from(schema.checkoutCustomers)
      .where(eq(schema.checkoutCustomers.userId, userId))
      .limit(1);

    if (!customer) {
      return c.json({ message: "Cadastro de checkout não encontrado. Complete seu perfil antes de comprar." }, 422);
    }

    // Impede múltiplas inscrições pendentes para o mesmo usuário
    const [pendente] = await db
      .select({ id: schema.mixInscricoes.id })
      .from(schema.mixInscricoes)
      .where(
        and(
          eq(schema.mixInscricoes.checkoutUserId, userId),
          eq(schema.mixInscricoes.status, "pendente")
        )
      )
      .limit(1);

    if (pendente) {
      return c.json({ message: "Você já tem uma inscrição pendente de pagamento. Finalize antes de criar outra." }, 409);
    }

    // Inscreve dentro de transação para evitar overbooking
    let inscricao: typeof schema.mixInscricoes.$inferSelect;

    try {
      inscricao = await db.transaction(async (tx) => {
        const vagasResult = await tx
          .select({ vagasOcupadas: count() })
          .from(schema.mixInscricoes)
          .where(
            and(
              eq(schema.mixInscricoes.sessaoId, sessaoId),
              eq(schema.mixInscricoes.status, "confirmado")
            )
          );
        const vagasOcupadas = vagasResult[0]?.vagasOcupadas ?? 0;

        if (vagasOcupadas >= sessao.totalVagas) {
          throw Object.assign(new Error("Sessão lotada."), { statusCode: 409 });
        }

        const [existente] = await tx
          .select({ id: schema.mixInscricoes.id })
          .from(schema.mixInscricoes)
          .where(
            and(
              eq(schema.mixInscricoes.sessaoId, sessaoId),
              eq(schema.mixInscricoes.checkoutUserId, userId),
              eq(schema.mixInscricoes.status, "confirmado")
            )
          )
          .limit(1);

        if (existente) {
          throw Object.assign(new Error("Você já tem uma vaga confirmada nesta sessão."), { statusCode: 409 });
        }

        const [novaInscricao] = await tx
          .insert(schema.mixInscricoes)
          .values({ sessaoId, checkoutUserId: userId, status: "pendente" })
          .returning();

        return novaInscricao!;
      });
    } catch (txError: any) {
      if (txError?.statusCode === 409) {
        return c.json({ message: txError.message }, 409);
      }
      throw txError; // re-throw para o outer catch
    }

    // Busca produto Mix ativo para montar URL do checkout
    let checkoutUrl: string | null = null;
    if (CHECKOUT_WEB_URL) {
      const [mixProduct] = await db
        .select({ id: schema.checkoutProducts.id })
        .from(schema.checkoutProducts)
        .where(
          and(
            eq(schema.checkoutProducts.isMix, true),
            eq(schema.checkoutProducts.active, true)
          )
        )
        .limit(1);

      if (mixProduct) {
        checkoutUrl = `${CHECKOUT_WEB_URL}/produto/${mixProduct.id}`;
      }
    }

    return c.json({
      inscricaoId: inscricao!.id,
      checkoutUrl,
      message: checkoutUrl
        ? "Inscrição criada. Finalize o pagamento para garantir a vaga."
        : "Inscrição criada. Entre em contato para finalizar o pagamento."
    });
  } catch (error: any) {
    // Unique constraint violation = usuário já tem inscrição nesta sessão
    if (error?.code === "23505" || String(error?.message).includes("unique")) {
      return c.json({ message: "Você já tem uma inscrição nesta sessão." }, 409);
    }
    console.error("[mix] inscrever error:", error);
    return c.json({ message: "Erro ao criar inscrição." }, 500);
  }
}

export async function minhasInscricoes(c: Context<AppEnv>): Promise<Response> {
  try {
    const userId = parseInt(c.get("user").id, 10);
    if (isNaN(userId)) {
      return c.json({ message: "Usuário inválido." }, 400);
    }

    const db = getCheckoutDb();

    const inscricoes = await db
      .select({
        id: schema.mixInscricoes.id,
        status: schema.mixInscricoes.status,
        createdAt: schema.mixInscricoes.createdAt,
        sessao: {
          id: schema.mixSessoes.id,
          jogo: schema.mixSessoes.jogo,
          dataPrevista: schema.mixSessoes.dataPrevista,
          horario: schema.mixSessoes.horario,
          modalidade: schema.mixSessoes.modalidade,
          statusSessao: schema.mixSessoes.status
        }
      })
      .from(schema.mixInscricoes)
      .innerJoin(schema.mixSessoes, eq(schema.mixInscricoes.sessaoId, schema.mixSessoes.id))
      .where(eq(schema.mixInscricoes.checkoutUserId, userId))
      .orderBy(schema.mixSessoes.dataPrevista);

    return c.json({ inscricoes });
  } catch (error) {
    console.error("[mix] minhasInscricoes error:", error);
    return c.json({ message: "Erro ao listar inscrições." }, 500);
  }
}

export async function confirmarPagamento(c: Context<AppEnv>): Promise<Response> {
  try {
    const secret = c.req.header("x-internal-secret");
    if (!secret || secret !== MIX_INTERNAL_SECRET) {
      return c.json({ message: "Unauthorized." }, 401);
    }

    const body = await c.req.json() as {
      orderId?: number;
      userId?: number;
      amountCents?: number;
    };

    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return c.json({ message: "orderId e userId são obrigatórios." }, 400);
    }

    const db = getCheckoutDb();

    // Idempotência: se já existe inscrição confirmada para este orderId, retorna ok
    const [jaConfirmada] = await db
      .select({ id: schema.mixInscricoes.id })
      .from(schema.mixInscricoes)
      .where(eq(schema.mixInscricoes.checkoutOrderId, orderId))
      .limit(1);

    if (jaConfirmada) {
      return c.json({ message: "Inscrição já confirmada.", inscricaoId: jaConfirmada.id });
    }

    // Busca inscrição pendente do usuário
    const [inscricao] = await db
      .select()
      .from(schema.mixInscricoes)
      .where(
        and(
          eq(schema.mixInscricoes.checkoutUserId, userId),
          eq(schema.mixInscricoes.status, "pendente")
        )
      )
      .orderBy(schema.mixInscricoes.createdAt)
      .limit(1);

    if (!inscricao) {
      return c.json({ message: "Nenhuma inscrição pendente encontrada para este usuário." }, 404);
    }

    // Re-verifica capacidade antes de confirmar
    const [sessao] = await db
      .select({ totalVagas: schema.mixSessoes.totalVagas })
      .from(schema.mixSessoes)
      .where(eq(schema.mixSessoes.id, inscricao.sessaoId))
      .limit(1);

    if (sessao) {
      const vagasResult = await db
        .select({ vagasOcupadas: count() })
        .from(schema.mixInscricoes)
        .where(
          and(
            eq(schema.mixInscricoes.sessaoId, inscricao.sessaoId),
            eq(schema.mixInscricoes.status, "confirmado")
          )
        );
      const vagasOcupadas = vagasResult[0]?.vagasOcupadas ?? 0;

      if (vagasOcupadas >= sessao.totalVagas) {
        return c.json({ message: "Sessão já está lotada.", inscricaoId: inscricao.id }, 409);
      }
    }

    await db
      .update(schema.mixInscricoes)
      .set({
        status: "confirmado",
        checkoutOrderId: orderId,
        updatedAt: new Date()
      })
      .where(eq(schema.mixInscricoes.id, inscricao.id));

    return c.json({ message: "Inscrição confirmada.", inscricaoId: inscricao.id });
  } catch (error) {
    console.error("[mix] confirmarPagamento error:", error);
    return c.json({ message: "Erro ao confirmar pagamento." }, 500);
  }
}
