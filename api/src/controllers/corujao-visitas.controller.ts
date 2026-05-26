import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

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

export async function createVisita(req: Request, res: Response) {
  try {
    const {
      contatoId: rawContatoId,
      dataVisita: rawDataVisita,
      amountCents: rawAmountCents,
      formaPagamento: rawFormaPagamento,
      observacoes
    } = req.body as {
      contatoId?: unknown;
      dataVisita?: unknown;
      amountCents?: unknown;
      formaPagamento?: unknown;
      observacoes?: string | null;
    };

    const contatoId = Number(rawContatoId);
    if (!Number.isInteger(contatoId) || contatoId <= 0) {
      return res.status(400).json({ message: "contatoId inválido." });
    }

    const dataParsed = parseVisitaDate(rawDataVisita);
    if (!dataParsed.ok) return res.status(400).json({ message: dataParsed.error });

    const formaParsed = parseFormaPagamento(rawFormaPagamento);
    if (!formaParsed.ok) return res.status(400).json({ message: formaParsed.error });

    const amountParsed = parseVisitaAmount(rawAmountCents, formaParsed.value);
    if (!amountParsed.ok) return res.status(400).json({ message: amountParsed.error });

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
      return res.status(404).json({ message: "Contato não encontrado." });
    }

    return res.status(201).json({
      visita: serializeVisita(result.visita!),
      contato: serializeContato(result.contato)
    });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === "23503") {
      return res.status(404).json({ message: "Contato não encontrado." });
    }
    console.error("[corujao] createVisita error:", error);
    return res.status(500).json({ message: "Erro ao registrar visita." });
  }
}
