import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

function serializeProduct(row: typeof schema.checkoutProducts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
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
    createdAt: row.createdAt.toISOString()
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

    const [[totalOrders], [paidOrders], [revenue], [totalClientes], recentOrders] =
      await Promise.all([
        db.select({ value: count() }).from(schema.checkoutOrders),
        db.select({ value: count() }).from(schema.checkoutOrders).where(eq(schema.checkoutOrders.status, "paid")),
        db.select({ value: sum(schema.checkoutOrders.amountCents) }).from(schema.checkoutOrders).where(eq(schema.checkoutOrders.status, "paid")),
        db.select({ value: count() }).from(schema.checkoutCustomers),
        db.select().from(schema.checkoutOrders).orderBy(desc(schema.checkoutOrders.createdAt)).limit(10)
      ]);

    return res.json({
      totalOrders: totalOrders?.value ?? 0,
      paidOrders: paidOrders?.value ?? 0,
      totalRevenueCents: Number(revenue?.value ?? 0),
      totalClientes: totalClientes?.value ?? 0,
      recentOrders: recentOrders.map(serializeOrder)
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

export async function listClientePedidos(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const pedidos = await db
      .select()
      .from(schema.checkoutOrders)
      .where(eq(schema.checkoutOrders.userId, userId))
      .orderBy(desc(schema.checkoutOrders.createdAt));

    return res.json({ pedidos: pedidos.map(serializeOrder) });
  } catch (error) {
    console.error("[checkout] listClientePedidos error:", error);
    return res.status(500).json({ message: "Erro ao listar pedidos do cliente." });
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
    const { name, description, amountCents } = req.body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
    };

    if (!name?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Nome e descrição são obrigatórios." });
    }

    const cents = Number(amountCents);
    if (!Number.isInteger(cents) || cents <= 0) {
      return res.status(400).json({ message: "Valor inválido." });
    }

    const db = getCheckoutDb();
    const [produto] = await db
      .insert(schema.checkoutProducts)
      .values({ name: name.trim(), description: description.trim(), amountCents: cents })
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

    const { name, description, amountCents, active } = req.body as {
      name?: string;
      description?: string;
      amountCents?: unknown;
      active?: unknown;
    };

    const db = getCheckoutDb();
    const updates: Partial<typeof schema.checkoutProducts.$inferInsert> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
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
