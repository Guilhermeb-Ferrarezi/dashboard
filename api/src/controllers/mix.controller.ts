import { and, count, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getCheckoutDb, schema } from "../db/index";

const DOTFY_BASE_URL = process.env.DOTFY_API_URL || "https://app.dotfy.com.br";
const MIX_DOTFY_SLUG = process.env.MIX_DOTFY_SLUG || "";
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

    // Inscreve dentro de transação para evitar overbooking
    let inscricao: typeof schema.mixInscricoes.$inferSelect;

    try {
      inscricao = await db.transaction(async (tx) => {
        const [{ vagasOcupadas }] = await tx
          .select({ vagasOcupadas: count() })
          .from(schema.mixInscricoes)
          .where(
            and(
              eq(schema.mixInscricoes.sessaoId, sessaoId),
              eq(schema.mixInscricoes.status, "confirmado")
            )
          );

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

    const checkoutUrl = MIX_DOTFY_SLUG
      ? `${DOTFY_BASE_URL}/checkout/${MIX_DOTFY_SLUG}?ref=mix-${inscricao!.id}`
      : null;

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
      inscricaoId?: number;
      orderId?: number;
    };

    const { inscricaoId, orderId } = body;
    if (!inscricaoId) {
      return c.json({ message: "inscricaoId é obrigatório." }, 400);
    }

    const db = getCheckoutDb();

    const [inscricao] = await db
      .select()
      .from(schema.mixInscricoes)
      .where(eq(schema.mixInscricoes.id, inscricaoId))
      .limit(1);

    if (!inscricao) {
      return c.json({ message: "Inscrição não encontrada." }, 404);
    }

    if (inscricao.status === "confirmado") {
      return c.json({ message: "Inscrição já confirmada.", inscricaoId });
    }

    // Re-verifica capacidade antes de confirmar
    const sessao = await db
      .select({ totalVagas: schema.mixSessoes.totalVagas })
      .from(schema.mixSessoes)
      .where(eq(schema.mixSessoes.id, inscricao.sessaoId))
      .limit(1)
      .then(r => r[0]);

    if (sessao) {
      const [{ vagasOcupadas }] = await db
        .select({ vagasOcupadas: count() })
        .from(schema.mixInscricoes)
        .where(
          and(
            eq(schema.mixInscricoes.sessaoId, inscricao.sessaoId),
            eq(schema.mixInscricoes.status, "confirmado")
          )
        );

      if (vagasOcupadas >= sessao.totalVagas) {
        return c.json({ message: "Sessão já está lotada. Não é possível confirmar.", inscricaoId }, 409);
      }
    }

    await db
      .update(schema.mixInscricoes)
      .set({
        status: "confirmado",
        checkoutOrderId: orderId ?? null,
        updatedAt: new Date()
      })
      .where(eq(schema.mixInscricoes.id, inscricaoId));

    return c.json({ message: "Inscrição confirmada.", inscricaoId });
  } catch (error) {
    console.error("[mix] confirmarPagamento error:", error);
    return c.json({ message: "Erro ao confirmar pagamento." }, 500);
  }
}
