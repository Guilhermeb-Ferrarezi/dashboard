import { and, count, desc, eq, ilike, inArray, or, sql, sum } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { getCheckoutDb, schema } from "../db/index";
import { createDotfyProduct, deleteDotfyProduct, updateDotfyProduct } from "../lib/dotfy-products";
import { parsePagination } from "../lib/pagination";

function serializeProduct(row: typeof schema.checkoutProducts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    features: (row.features as string[]) ?? [],
    amountCents: row.amountCents,
    discountPercent: row.discountPercent ?? null,
    active: row.active,
    imageKey: row.imageKey ?? null,
    imageUrl: row.imageUrl ?? null,
    isCorujao: row.isCorujao,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeCupom(row: typeof schema.checkoutCoupons.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discountPercent,
    maxUses: row.maxUses ?? null,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
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
    chargeId: row.chargeId ?? null,
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
    providerCustomerId: customer.providerCustomerId,
    createdAt: customer.createdAt.toISOString(),
    orderCount,
    totalSpentCents,
    lastOrderAt: userStats?.lastOrderAt ? new Date(userStats.lastOrderAt).toISOString() : null,
    lastPaidProduct,
    purchasedProducts: uniqueProducts,
    isVip: totalSpentCents >= 5000 || orderCount >= 3
  };
}

export async function getDashboard(_c: Context<AppEnv>): Promise<Response> {
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

    return _c.json({
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
    return _c.json({ message: "Erro ao carregar dashboard." }, 500);
  }
}

export async function listClientes(c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    const { page, limit, skip: offset } = parsePagination(c, 20);
    const q = String(c.req.query("q") || "").trim();

    const searchFilter = q
      ? or(
          ilike(schema.checkoutCustomers.userLogin, `%${q}%`),
          ilike(schema.checkoutCustomers.userEmail, `%${q}%`)
        )
      : undefined;

    const [[totalRow], customers] = await Promise.all([
      db.select({ value: count() }).from(schema.checkoutCustomers).where(searchFilter),
      db
        .select()
        .from(schema.checkoutCustomers)
        .where(searchFilter)
        .orderBy(desc(schema.checkoutCustomers.createdAt))
        .limit(limit)
        .offset(offset)
    ]);

    const total = Number(totalRow?.value ?? 0);

    if (customers.length === 0) {
      return c.json({
        clientes: [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
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

    return c.json({
      clientes: customers.map((c) => serializeClienteEnriquecido(c, typedStats, paidOrders)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("[checkout] listClientes error:", error);
    return c.json({ message: "Erro ao listar clientes." }, 500);
  }
}

export async function updateCliente(c: Context<AppEnv>): Promise<Response> {
  try {
    const userId = Number(c.req.param("userId"));
    if (isNaN(userId)) return c.json({ message: "ID inválido." }, 400);

    const body = await c.req.json();
    const { userLogin, userEmail } = body as { userLogin?: string; userEmail?: string };

    const updates: Record<string, string | null> = {};
    if (userLogin !== undefined) updates.userLogin = userLogin.trim() || null;
    if (userEmail !== undefined) updates.userEmail = userEmail.trim() || null;

    if (Object.keys(updates).length === 0) {
      return c.json({ message: "Nenhum campo para atualizar." }, 400);
    }

    const db = getCheckoutDb();
    const [updated] = await db
      .update(schema.checkoutCustomers)
      .set(updates)
      .where(eq(schema.checkoutCustomers.userId, userId))
      .returning();

    if (!updated) return c.json({ message: "Cliente não encontrado." }, 404);

    return c.json({ ok: true });
  } catch (error) {
    console.error("[checkout] updateCliente error:", error);
    return c.json({ message: "Erro ao atualizar cliente." }, 500);
  }
}

export async function deleteCliente(c: Context<AppEnv>): Promise<Response> {
  try {
    const userId = Number(c.req.param("userId"));
    if (isNaN(userId)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();

    const [paidOrder] = await db
      .select({ id: schema.checkoutOrders.id })
      .from(schema.checkoutOrders)
      .where(
        and(
          eq(schema.checkoutOrders.userId, userId),
          eq(schema.checkoutOrders.status, "paid")
        )
      )
      .limit(1);

    if (paidOrder) {
      return c.json({ message: "Não é possível remover um cliente com pagamentos confirmados." }, 403);
    }

    const [deleted] = await db
      .delete(schema.checkoutCustomers)
      .where(eq(schema.checkoutCustomers.userId, userId))
      .returning();

    if (!deleted) return c.json({ message: "Cliente não encontrado." }, 404);

    return c.json({ ok: true });
  } catch (error) {
    console.error("[checkout] deleteCliente error:", error);
    return c.json({ message: "Erro ao remover cliente." }, 500);
  }
}

export async function listClientePedidos(c: Context<AppEnv>): Promise<Response> {
  try {
    const userId = Number(c.req.param("userId"));
    if (isNaN(userId)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const { page, limit, skip: offset } = parsePagination(c, 15);
    const descriptionFilter = String(c.req.query("description") || "").trim();

    const baseFilter = descriptionFilter
      ? and(
          eq(schema.checkoutOrders.userId, userId),
          eq(schema.checkoutOrders.description, descriptionFilter)
        )
      : eq(schema.checkoutOrders.userId, userId);

    const [[totalRow], statusCounts, orders] = await Promise.all([
      db.select({ value: count() }).from(schema.checkoutOrders).where(baseFilter),
      db
        .select({
          status: schema.checkoutOrders.status,
          total: sql<number>`COUNT(*)::int`
        })
        .from(schema.checkoutOrders)
        .where(eq(schema.checkoutOrders.userId, userId))
        .groupBy(schema.checkoutOrders.status),
      db
        .select()
        .from(schema.checkoutOrders)
        .where(baseFilter)
        .orderBy(desc(schema.checkoutOrders.createdAt))
        .limit(limit)
        .offset(offset)
    ]);

    const total = Number(totalRow?.value ?? 0);

    const orderIds = orders.map((o) => o.id);
    const payments =
      orderIds.length > 0
        ? await db
            .select({ orderId: schema.checkoutPayments.orderId, paidAt: schema.checkoutPayments.paidAt })
            .from(schema.checkoutPayments)
            .where(inArray(schema.checkoutPayments.orderId, orderIds))
        : [];

    const paidAtMap = new Map(payments.map((p) => [p.orderId, p.paidAt]));

    const paidCount = Number(statusCounts.find((s) => s.status === "paid")?.total ?? 0);
    const refundedCount = Number(statusCounts.find((s) => s.status === "refunded")?.total ?? 0);

    return c.json({
      pedidos: orders.map((o) => ({
        ...serializeOrder(o),
        paidAt: paidAtMap.get(o.id)?.toISOString() ?? null
      })),
      paidCount,
      refundedCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("[checkout] listClientePedidos error:", error);
    return c.json({ message: "Erro ao listar pedidos do cliente." }, 500);
  }
}

export async function getComprovante(c: Context<AppEnv>): Promise<Response> {
  try {
    const orderId = Number(c.req.param("id"));
    if (isNaN(orderId)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const [order] = await db
      .select()
      .from(schema.checkoutOrders)
      .where(eq(schema.checkoutOrders.id, orderId))
      .limit(1);

    if (!order) return c.json({ message: "Pedido não encontrado." }, 404);
    if (order.status !== "paid") return c.json({ message: "Pedido não foi pago." }, 400);

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
${order.chargeId ? `<div class="row"><span class="label">Charge ID</span><span class="value" style="font-family:monospace;font-size:12px">${order.chargeId}</span></div>` : ""}
<p style="margin-top:24px;font-size:12px;color:#999;text-align:center">Santos Tech · Comprovante gerado em ${new Date().toLocaleString("pt-BR")}</p>
</body></html>`;

    return c.html(html);
  } catch (error) {
    console.error("[checkout] getComprovante error:", error);
    return c.json({ message: "Erro ao gerar comprovante." }, 500);
  }
}

export async function refundOrder(c: Context<AppEnv>): Promise<Response> {
  try {
    const orderId = Number(c.req.param("id"));
    if (isNaN(orderId)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const [order] = await db
      .select()
      .from(schema.checkoutOrders)
      .where(eq(schema.checkoutOrders.id, orderId))
      .limit(1);

    if (!order) return c.json({ message: "Pedido não encontrado." }, 404);
    if (order.status !== "paid") return c.json({ message: "Apenas pedidos pagos podem ser reembolsados." }, 400);

    await db
      .update(schema.checkoutOrders)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(schema.checkoutOrders.id, orderId));

    return c.json({ message: "Reembolso realizado.", orderId });
  } catch (error) {
    console.error("[checkout] refundOrder error:", error);
    return c.json({ message: "Erro ao reembolsar." }, 500);
  }
}

export async function listClienteAssinaturas(c: Context<AppEnv>): Promise<Response> {
  try {
    const userId = Number(c.req.param("userId"));
    if (isNaN(userId)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const assinaturas = await db
      .select()
      .from(schema.checkoutSubscriptions)
      .where(eq(schema.checkoutSubscriptions.userId, userId))
      .orderBy(desc(schema.checkoutSubscriptions.createdAt));

    return c.json({
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
    return c.json({ message: "Erro ao listar assinaturas do cliente." }, 500);
  }
}

export async function getNovosPorMes(_c: Context<AppEnv>): Promise<Response> {
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

    return _c.json({ data: Array.from(rows) });
  } catch (error) {
    console.error("[checkout] getNovosPorMes error:", error);
    return _c.json({ message: "Erro ao buscar dados mensais." }, 500);
  }
}

export async function listProdutos(_c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    const produtos = await db
      .select()
      .from(schema.checkoutProducts)
      .orderBy(desc(schema.checkoutProducts.createdAt));

    return _c.json({ produtos: produtos.map(serializeProduct) });
  } catch (error) {
    console.error("[checkout] listProdutos error:", error);
    return _c.json({ message: "Erro ao listar produtos." }, 500);
  }
}

export async function createProduto(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { name, description, amountCents, discountPercent, features, imageKey, imageUrl } = body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
      discountPercent?: unknown;
      features?: unknown;
      imageKey?: string;
      imageUrl?: string;
    };

    if (!name?.trim()) {
      return c.json({ message: "Nome é obrigatório." }, 400);
    }

    const cents = Number(amountCents);
    if (!Number.isInteger(cents) || cents <= 0) {
      return c.json({ message: "Valor inválido." }, 400);
    }

    let discPct: number | null = null;
    if (discountPercent !== undefined && discountPercent !== null && discountPercent !== "") {
      discPct = Number(discountPercent);
      if (!Number.isInteger(discPct) || discPct < 0 || discPct > 99) {
        return c.json({ message: "Desconto deve ser entre 0 e 99%." }, 400);
      }
    }

    const featuresArr = Array.isArray(features) ? (features as string[]).map(String).filter(Boolean) : [];
    const desc = description?.trim() || featuresArr[0] || name.trim();

    const db = getCheckoutDb();
    const [produto] = await db
      .insert(schema.checkoutProducts)
      .values({
        name: name.trim(),
        description: desc,
        features: featuresArr,
        amountCents: cents,
        discountPercent: discPct,
        imageKey: imageKey?.trim() || null,
        imageUrl: imageUrl?.trim() || null
      })
      .returning();

    const dotfyResult = await createDotfyProduct({
      title: name.trim(),
      description: desc,
      priceCents: cents,
      discountPercent: discPct,
      imageUrl: imageUrl?.trim() || undefined
    });

    if (dotfyResult.ok) {
      await db
        .update(schema.checkoutProducts)
        .set({ dotfyProductId: dotfyResult.productId, dotfySlug: dotfyResult.slug })
        .where(eq(schema.checkoutProducts.id, produto!.id));
    } else {
      console.warn("[checkout] dotfy product sync failed:", dotfyResult.error);
    }

    return c.json({ produto: serializeProduct(produto!) }, 201);
  } catch (error) {
    console.error("[checkout] createProduto error:", error);
    return c.json({ message: "Erro ao criar produto." }, 500);
  }
}

export async function updateProduto(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const body = await c.req.json();
    const { name, description, amountCents, discountPercent, active, features, imageKey, imageUrl, isCorujao } = body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
      discountPercent?: unknown;
      active?: unknown;
      features?: unknown;
      imageKey?: string | null;
      imageUrl?: string | null;
      isCorujao?: unknown;
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
        return c.json({ message: "Valor inválido." }, 400);
      }
      updates.amountCents = cents;
    }
    if (discountPercent !== undefined) {
      if (discountPercent === null || discountPercent === "") {
        updates.discountPercent = null;
      } else {
        const discPct = Number(discountPercent);
        if (!Number.isInteger(discPct) || discPct < 0 || discPct > 99) {
          return c.json({ message: "Desconto deve ser entre 0 e 99%." }, 400);
        }
        updates.discountPercent = discPct;
      }
    }
    if (active !== undefined) updates.active = Boolean(active);
    if (isCorujao !== undefined) updates.isCorujao = Boolean(isCorujao);
    if (imageKey !== undefined) updates.imageKey = imageKey?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;

    const [produto] = await db
      .update(schema.checkoutProducts)
      .set(updates)
      .where(eq(schema.checkoutProducts.id, id))
      .returning();

    if (!produto) return c.json({ message: "Produto não encontrado." }, 404);

    if (name !== undefined || amountCents !== undefined || discountPercent !== undefined || imageUrl !== undefined) {
      try {
        const dotfyResult = await updateDotfyProduct(produto.dotfyProductId, {
          title: produto.name,
          description: produto.description,
          priceCents: produto.amountCents,
          discountPercent: produto.discountPercent,
          imageUrl: produto.imageUrl || undefined
        });

        if (dotfyResult.ok) {
          await db
            .update(schema.checkoutProducts)
            .set({ dotfyProductId: dotfyResult.productId, dotfySlug: dotfyResult.slug })
            .where(eq(schema.checkoutProducts.id, id));
        } else {
          console.warn("[checkout] dotfy product update failed:", dotfyResult.error);
        }
      } catch (err) {
        console.warn("[checkout] dotfy product update error:", err);
      }
    }

    return c.json({ produto: serializeProduct(produto) });
  } catch (error) {
    console.error("[checkout] updateProduto error:", error);
    return c.json({ message: "Erro ao atualizar produto." }, 500);
  }
}

export async function deleteProduto(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.checkoutProducts)
      .where(eq(schema.checkoutProducts.id, id))
      .returning();

    if (!deleted) return c.json({ message: "Produto não encontrado." }, 404);

    try {
      if (deleted.dotfyProductId) {
        const dotfyResult = await deleteDotfyProduct(deleted.dotfyProductId);
        if (!dotfyResult.ok) {
          console.warn("[checkout] dotfy product delete failed:", dotfyResult.error);
        }
      }
    } catch (err) {
      console.warn("[checkout] dotfy product delete error:", err);
    }

    return c.json({ message: "Produto removido." });
  } catch (error) {
    console.error("[checkout] deleteProduto error:", error);
    return c.json({ message: "Erro ao remover produto." }, 500);
  }
}

// ── Cupons ────────────────────────────────────────────────────────────────────

export async function listCupons(_c: Context<AppEnv>): Promise<Response> {
  try {
    const db = getCheckoutDb();
    const cupons = await db
      .select()
      .from(schema.checkoutCoupons)
      .orderBy(desc(schema.checkoutCoupons.createdAt));
    return _c.json({ cupons: cupons.map(serializeCupom) });
  } catch (error) {
    console.error("[checkout] listCupons error:", error);
    return _c.json({ message: "Erro ao listar cupons." }, 500);
  }
}

export async function createCupom(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { code, discountPercent, maxUses, expiresAt } = body as {
      code?: string;
      discountPercent?: unknown;
      maxUses?: unknown;
      expiresAt?: string | null;
    };

    if (!code?.trim()) {
      return c.json({ message: "Código é obrigatório." }, 400);
    }

    const discPct = Number(discountPercent);
    if (!Number.isInteger(discPct) || discPct < 1 || discPct > 99) {
      return c.json({ message: "Desconto deve ser entre 1 e 99%." }, 400);
    }

    let maxUsesVal: number | null = null;
    if (maxUses !== undefined && maxUses !== null && maxUses !== "") {
      maxUsesVal = Number(maxUses);
      if (!Number.isInteger(maxUsesVal) || maxUsesVal < 1) {
        return c.json({ message: "Limite de usos inválido." }, 400);
      }
    }

    const expiresAtVal = expiresAt ? new Date(expiresAt) : null;

    const db = getCheckoutDb();
    const [cupom] = await db
      .insert(schema.checkoutCoupons)
      .values({
        code: code.trim().toUpperCase(),
        discountPercent: discPct,
        maxUses: maxUsesVal,
        expiresAt: expiresAtVal
      })
      .returning();

    return c.json({ cupom: serializeCupom(cupom!) }, 201);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return c.json({ message: "Já existe um cupom com esse código." }, 409);
    }
    console.error("[checkout] createCupom error:", error);
    return c.json({ message: "Erro ao criar cupom." }, 500);
  }
}

export async function updateCupom(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const body = await c.req.json();
    const { discountPercent, maxUses, expiresAt, active } = body as {
      discountPercent?: unknown;
      maxUses?: unknown;
      expiresAt?: string | null;
      active?: unknown;
    };

    const updates: Partial<typeof schema.checkoutCoupons.$inferInsert> = {
      updatedAt: new Date()
    };

    if (discountPercent !== undefined) {
      const discPct = Number(discountPercent);
      if (!Number.isInteger(discPct) || discPct < 1 || discPct > 99) {
        return c.json({ message: "Desconto deve ser entre 1 e 99%." }, 400);
      }
      updates.discountPercent = discPct;
    }

    if (maxUses !== undefined) {
      if (maxUses === null || maxUses === "") {
        updates.maxUses = null;
      } else {
        const val = Number(maxUses);
        if (!Number.isInteger(val) || val < 1) {
          return c.json({ message: "Limite de usos inválido." }, 400);
        }
        updates.maxUses = val;
      }
    }

    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    if (active !== undefined) updates.active = Boolean(active);

    const db = getCheckoutDb();
    const [cupom] = await db
      .update(schema.checkoutCoupons)
      .set(updates)
      .where(eq(schema.checkoutCoupons.id, id))
      .returning();

    if (!cupom) return c.json({ message: "Cupom não encontrado." }, 404);

    return c.json({ cupom: serializeCupom(cupom) });
  } catch (error) {
    console.error("[checkout] updateCupom error:", error);
    return c.json({ message: "Erro ao atualizar cupom." }, 500);
  }
}

export async function deleteCupom(c: Context<AppEnv>): Promise<Response> {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "ID inválido." }, 400);

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.checkoutCoupons)
      .where(eq(schema.checkoutCoupons.id, id))
      .returning();

    if (!deleted) return c.json({ message: "Cupom não encontrado." }, 404);

    return c.json({ message: "Cupom removido." });
  } catch (error) {
    console.error("[checkout] deleteCupom error:", error);
    return c.json({ message: "Erro ao remover cupom." }, 500);
  }
}
