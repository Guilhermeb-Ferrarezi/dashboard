import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

function serializeProduct(row: typeof schema.checkoutProducts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    features: (row.features as string[]) ?? [],
    amountCents: row.amountCents,
    active: row.active,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeOrder(row: typeof schema.checkoutOrders.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    description: row.description,
    amountCents: row.amountCents,
    status: row.status,
    abacateBillingId: row.abacateBillingId ?? null,
    checkoutUrl: row.checkoutUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

type OrderStatsRow = {
  userId: number;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
};

type PaidOrderRow = {
  userId: number;
  description: string;
  createdAt: Date;
};

function serializeClienteEnriquecido(
  customer: typeof schema.checkoutCustomers.$inferSelect,
  stats: OrderStatsRow[],
  paidOrders: PaidOrderRow[]
) {
  const userStats = stats.find((s) => s.userId === customer.userId);
  const userPaidOrders = paidOrders.filter((p) => p.userId === customer.userId);
  const uniqueProducts = [...new Set(userPaidOrders.map((p) => p.description))];
  const lastPaidProduct = userPaidOrders[0]?.description ?? null;

  const totalSpentCents = Number(userStats?.totalSpentCents ?? 0);
  const orderCount = Number(userStats?.orderCount ?? 0);

  return {
    id: customer.id,
    userId: customer.userId,
    userLogin: customer.userLogin ?? `user_${customer.userId}`,
    userEmail: customer.userEmail ?? null,
    userName: customer.name ?? null,
    userTaxId: customer.taxId ?? null,
    userPhone: customer.cellphone ?? null,
    abacateCustomerId: customer.abacateCustomerId,
    createdAt: customer.createdAt.toISOString(),
    orderCount,
    totalSpentCents,
    lastOrderAt: userStats?.lastOrderAt ? new Date(userStats.lastOrderAt).toISOString() : null,
    lastPaidProduct,
    purchasedProducts: uniqueProducts,
    isVip: totalSpentCents >= 5000 || orderCount >= 3
  };
}

export async function getDashboard(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();

    const [
      [totalOrders],
      [paidOrders],
      [revenue],
      [totalClientes],
      [receitaHoje],
      [receitaSemana],
      [pedidosHoje],
      recentOrdersRaw,
      receitaPorProduto,
      pedidosPorDia,
      statusBreakdown
    ] = await Promise.all([
      db.select({ value: count() }).from(schema.checkoutOrders),
      db.select({ value: count() }).from(schema.checkoutOrders).where(eq(schema.checkoutOrders.status, "paid")),
      db.select({ value: sum(schema.checkoutOrders.amountCents) }).from(schema.checkoutOrders).where(eq(schema.checkoutOrders.status, "paid")),
      db.select({ value: count() }).from(schema.checkoutCustomers),
      db.execute(sql`SELECT COALESCE(SUM(amount_cents),0)::int AS value FROM checkout_orders WHERE status='paid' AND created_at >= CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(amount_cents),0)::int AS value FROM checkout_orders WHERE status='paid' AND created_at >= date_trunc('week', NOW())`),
      db.execute(sql`SELECT COUNT(*)::int AS value FROM checkout_orders WHERE created_at >= CURRENT_DATE`),
      db.execute(sql`
        SELECT o.id, o.user_id, o.description, o.amount_cents, o.status, o.created_at,
               c.user_login
        FROM checkout_orders o
        LEFT JOIN checkout_customers c ON c.user_id = o.user_id
        ORDER BY o.created_at DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT description AS produto, SUM(amount_cents)::int AS receita, COUNT(*)::int AS qtd
        FROM checkout_orders WHERE status='paid'
        GROUP BY description ORDER BY receita DESC LIMIT 6
      `),
      db.execute(sql`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS dia, COUNT(*)::int AS total
        FROM checkout_orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY dia ORDER BY dia ASC
      `),
      db.execute(sql`
        SELECT status, COUNT(*)::int AS total FROM checkout_orders GROUP BY status
      `)
    ]);

    const totalRevenueCents = Number(revenue?.value ?? 0);
    const paidCount = Number(paidOrders?.value ?? 0);

    // db.execute() with postgres-js returns a RowList (array-like), first element IS the row
    const receitaHojeRow = receitaHoje as { value: number } | undefined;
    const receitaSemanaRow = receitaSemana as { value: number } | undefined;
    const pedidosHojeRow = pedidosHoje as { value: number } | undefined;

    return res.json({
      totalOrders: Number(totalOrders?.value ?? 0),
      paidOrders: paidCount,
      totalRevenueCents,
      totalClientes: Number(totalClientes?.value ?? 0),
      ticketMedioCents: paidCount > 0 ? Math.round(totalRevenueCents / paidCount) : 0,
      receitaHojeCents: Number(receitaHojeRow?.value ?? 0),
      receitaSemanaCents: Number(receitaSemanaRow?.value ?? 0),
      pedidosHoje: Number(pedidosHojeRow?.value ?? 0),
      recentOrders: Array.from(recentOrdersRaw as Iterable<Record<string, unknown>>).map((r) => {
        const row = r as { id: number; user_id: number; description: string; amount_cents: number; status: string; created_at: Date; user_login: string | null };
        return {
          id: row.id,
          userId: row.user_id,
          userLogin: row.user_login ?? `user_${row.user_id}`,
          description: row.description,
          amountCents: row.amount_cents,
          status: row.status,
          createdAt: new Date(row.created_at).toISOString()
        };
      }),
      receitaPorProduto: Array.from(receitaPorProduto as Iterable<Record<string, unknown>>).map((r) => {
        const row = r as { produto: string; receita: number; qtd: number };
        return { produto: row.produto, receita: Number(row.receita), qtd: Number(row.qtd) };
      }),
      pedidosPorDia: Array.from(pedidosPorDia as Iterable<Record<string, unknown>>).map((r) => {
        const row = r as { dia: string; total: number };
        return { dia: row.dia, total: Number(row.total) };
      }),
      statusBreakdown: Array.from(statusBreakdown as Iterable<Record<string, unknown>>).map((r) => {
        const row = r as { status: string; total: number };
        return { status: row.status, total: Number(row.total) };
      })
    });
  } catch (error) {
    console.error("[checkout] getDashboard error:", error);
    return res.status(500).json({ message: "Erro ao carregar dashboard." });
  }
}

export async function listClientes(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();

    const customers = await db
      .select()
      .from(schema.checkoutCustomers)
      .orderBy(desc(schema.checkoutCustomers.createdAt));

    if (customers.length === 0) {
      return res.json({ clientes: [] });
    }

    const userIds = customers.map((c) => c.userId);

    const [stats, paidOrders] = await Promise.all([
      db
        .select({
          userId: schema.checkoutOrders.userId,
          orderCount: sql<number>`COUNT(CASE WHEN ${schema.checkoutOrders.status} = 'paid' THEN 1 END)::int`,
          totalSpentCents: sql<number>`COALESCE(SUM(CASE WHEN ${schema.checkoutOrders.status} = 'paid' THEN ${schema.checkoutOrders.amountCents} ELSE 0 END), 0)::int`,
          lastOrderAt: sql<string | null>`MAX(${schema.checkoutOrders.createdAt})`
        })
        .from(schema.checkoutOrders)
        .where(inArray(schema.checkoutOrders.userId, userIds))
        .groupBy(schema.checkoutOrders.userId),
      db
        .select({
          userId: schema.checkoutOrders.userId,
          description: schema.checkoutOrders.description,
          createdAt: schema.checkoutOrders.createdAt
        })
        .from(schema.checkoutOrders)
        .where(
          and(
            inArray(schema.checkoutOrders.userId, userIds),
            eq(schema.checkoutOrders.status, "paid")
          )
        )
        .orderBy(desc(schema.checkoutOrders.createdAt))
    ]);

    const typedStats: OrderStatsRow[] = stats.map((s) => ({
      userId: s.userId,
      orderCount: Number(s.orderCount),
      totalSpentCents: Number(s.totalSpentCents),
      lastOrderAt: s.lastOrderAt as string | null
    }));

    return res.json({
      clientes: customers.map((c) => serializeClienteEnriquecido(c, typedStats, paidOrders))
    });
  } catch (error) {
    console.error("[checkout] listClientes error:", error);
    return res.status(500).json({ message: "Erro ao listar clientes." });
  }
}

export async function updateCliente(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const { userLogin, userEmail } = req.body as { userLogin?: string; userEmail?: string };

    const updates: Record<string, string | null> = {};
    if (userLogin !== undefined) updates.userLogin = userLogin.trim() || null;
    if (userEmail !== undefined) updates.userEmail = userEmail.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    const db = getCheckoutDb();
    const [updated] = await db
      .update(schema.checkoutCustomers)
      .set(updates)
      .where(eq(schema.checkoutCustomers.userId, userId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Cliente não encontrado." });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[checkout] updateCliente error:", error);
    return res.status(500).json({ message: "Erro ao atualizar cliente." });
  }
}

export async function deleteCliente(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.checkoutCustomers)
      .where(eq(schema.checkoutCustomers.userId, userId))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Cliente não encontrado." });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[checkout] deleteCliente error:", error);
    return res.status(500).json({ message: "Erro ao remover cliente." });
  }
}

export async function listClientePedidos(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const pedidos = await db
      .select({
        order: schema.checkoutOrders,
        paidAt: schema.checkoutPayments.paidAt
      })
      .from(schema.checkoutOrders)
      .leftJoin(schema.checkoutPayments, eq(schema.checkoutOrders.id, schema.checkoutPayments.orderId))
      .where(eq(schema.checkoutOrders.userId, userId))
      .orderBy(desc(schema.checkoutOrders.createdAt));

    const seen = new Set<number>();
    const unique = pedidos.filter((r) => {
      if (seen.has(r.order.id)) return false;
      seen.add(r.order.id);
      return true;
    });

    return res.json({ pedidos: unique.map((r) => ({
      ...serializeOrder(r.order),
      paidAt: r.paidAt?.toISOString() ?? null
    })) });
  } catch (error) {
    console.error("[checkout] listClientePedidos error:", error);
    return res.status(500).json({ message: "Erro ao listar pedidos do cliente." });
  }
}

export async function getComprovante(req: Request, res: Response) {
  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [order] = await db
      .select()
      .from(schema.checkoutOrders)
      .where(eq(schema.checkoutOrders.id, orderId))
      .limit(1);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });
    if (order.status !== "paid") return res.status(400).json({ message: "Pedido não foi pago." });

    const [customer] = await db
      .select()
      .from(schema.checkoutCustomers)
      .where(eq(schema.checkoutCustomers.userId, order.userId))
      .limit(1);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Comprovante #${order.id}</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}
h1{font-size:20px;border-bottom:2px solid #22c55e;padding-bottom:8px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
.label{color:#666}.value{font-weight:600}
.status{background:#f0fdf4;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:13px}
@media print{body{margin:0}}</style></head><body>
<h1>Comprovante de pagamento</h1>
<div class="row"><span class="label">ID do pedido</span><span class="value">#${order.id}</span></div>
<div class="row"><span class="label">Produto</span><span class="value">${order.description}</span></div>
<div class="row"><span class="label">Valor</span><span class="value">R$ ${(order.amountCents / 100).toFixed(2).replace(".", ",")}</span></div>
<div class="row"><span class="label">Status</span><span class="status">Pago</span></div>
<div class="row"><span class="label">Data</span><span class="value">${order.createdAt.toLocaleDateString("pt-BR")}</span></div>
<div class="row"><span class="label">Cliente</span><span class="value">${customer?.userLogin ?? "—"}</span></div>
<div class="row"><span class="label">E-mail</span><span class="value">${customer?.userEmail ?? "—"}</span></div>
${order.abacateBillingId ? `<div class="row"><span class="label">Billing ID</span><span class="value" style="font-family:monospace;font-size:12px">${order.abacateBillingId}</span></div>` : ""}
<p style="margin-top:24px;font-size:12px;color:#999;text-align:center">Santos Tech · Comprovante gerado em ${new Date().toLocaleString("pt-BR")}</p>
</body></html>`;

    return res.type("html").send(html);
  } catch (error) {
    console.error("[checkout] getComprovante error:", error);
    return res.status(500).json({ message: "Erro ao gerar comprovante." });
  }
}

export async function refundOrder(req: Request, res: Response) {
  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [order] = await db
      .select()
      .from(schema.checkoutOrders)
      .where(eq(schema.checkoutOrders.id, orderId))
      .limit(1);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });
    if (order.status !== "paid") return res.status(400).json({ message: "Apenas pedidos pagos podem ser reembolsados." });

    await db
      .update(schema.checkoutOrders)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(schema.checkoutOrders.id, orderId));

    return res.json({ message: "Reembolso realizado.", orderId });
  } catch (error) {
    console.error("[checkout] refundOrder error:", error);
    return res.status(500).json({ message: "Erro ao reembolsar." });
  }
}

export async function listClienteAssinaturas(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const assinaturas = await db
      .select()
      .from(schema.checkoutSubscriptions)
      .where(eq(schema.checkoutSubscriptions.userId, userId))
      .orderBy(desc(schema.checkoutSubscriptions.createdAt));

    return res.json({
      assinaturas: assinaturas.map((s) => ({
        id: s.id,
        userId: s.userId,
        productId: s.productId,
        productName: s.productName,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        expiresAt: s.expiresAt?.toISOString() ?? null,
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("[checkout] listClienteAssinaturas error:", error);
    return res.status(500).json({ message: "Erro ao listar assinaturas do cliente." });
  }
}

export async function getNovosPorMes(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const rows = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*)::int as total
      FROM checkout_customers
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY mes
      ORDER BY mes ASC
    `);

    return res.json({ data: Array.from(rows) });
  } catch (error) {
    console.error("[checkout] getNovosPorMes error:", error);
    return res.status(500).json({ message: "Erro ao buscar dados mensais." });
  }
}

export async function listProdutos(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const produtos = await db
      .select()
      .from(schema.checkoutProducts)
      .orderBy(desc(schema.checkoutProducts.createdAt));

    return res.json({ produtos: produtos.map(serializeProduct) });
  } catch (error) {
    console.error("[checkout] listProdutos error:", error);
    return res.status(500).json({ message: "Erro ao listar produtos." });
  }
}

export async function createProduto(req: Request, res: Response) {
  try {
    const { name, description, amountCents, features } = req.body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
      features?: unknown;
    };

    if (!name?.trim()) {
      return res.status(400).json({ message: "Nome é obrigatório." });
    }

    const cents = Number(amountCents);
    if (!Number.isInteger(cents) || cents <= 0) {
      return res.status(400).json({ message: "Valor inválido." });
    }

    const featuresArr = Array.isArray(features) ? (features as string[]).map(String).filter(Boolean) : [];
    const desc = description?.trim() || featuresArr[0] || name.trim();

    const db = getCheckoutDb();
    const [produto] = await db
      .insert(schema.checkoutProducts)
      .values({ name: name.trim(), description: desc, features: featuresArr, amountCents: cents })
      .returning();

    return res.status(201).json({ produto: serializeProduct(produto!) });
  } catch (error) {
    console.error("[checkout] createProduto error:", error);
    return res.status(500).json({ message: "Erro ao criar produto." });
  }
}

export async function updateProduto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const { name, description, amountCents, active, features } = req.body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
      active?: unknown;
      features?: unknown;
    };

    const db = getCheckoutDb();
    const updates: Partial<typeof schema.checkoutProducts.$inferInsert> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (features !== undefined) {
      const featuresArr = Array.isArray(features) ? (features as string[]).map(String).filter(Boolean) : [];
      updates.features = featuresArr;
      if (description === undefined && featuresArr.length > 0) updates.description = featuresArr[0];
    }
    if (amountCents !== undefined) {
      const cents = Number(amountCents);
      if (!Number.isInteger(cents) || cents <= 0) {
        return res.status(400).json({ message: "Valor inválido." });
      }
      updates.amountCents = cents;
    }
    if (active !== undefined) updates.active = Boolean(active);

    const [produto] = await db
      .update(schema.checkoutProducts)
      .set(updates)
      .where(eq(schema.checkoutProducts.id, id))
      .returning();

    if (!produto) return res.status(404).json({ message: "Produto não encontrado." });

    return res.json({ produto: serializeProduct(produto) });
  } catch (error) {
    console.error("[checkout] updateProduto error:", error);
    return res.status(500).json({ message: "Erro ao atualizar produto." });
  }
}

export async function deleteProduto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.checkoutProducts)
      .where(eq(schema.checkoutProducts.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Produto não encontrado." });

    return res.json({ message: "Produto removido." });
  } catch (error) {
    console.error("[checkout] deleteProduto error:", error);
    return res.status(500).json({ message: "Erro ao remover produto." });
  }
}
