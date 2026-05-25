import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Request, Response } from "express";

import { getCheckoutDb, schema } from "../db/index";

function serializeCliente(row: typeof schema.corujaoClientes.$inferSelect & {
  visitouAlgumaVez?: boolean;
  ultimaVisita?: string | null;
  totalConfirmacoes?: number;
}) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    instagram: row.instagram ?? null,
    notes: row.notes ?? null,
    active: row.active,
    visitouAlgumaVez: row.visitouAlgumaVez ?? false,
    ultimaVisita: row.ultimaVisita ?? null,
    totalConfirmacoes: row.totalConfirmacoes ?? 0,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeSessao(row: typeof schema.corujaoSessoes.$inferSelect & {
  confirmados?: number;
  presentes?: number;
  pendentes?: number;
  totalClientes?: number;
}) {
  return {
    id: row.id,
    date: row.date,
    title: row.title ?? null,
    status: row.status,
    confirmados: row.confirmados ?? 0,
    presentes: row.presentes ?? 0,
    pendentes: row.pendentes ?? 0,
    totalClientes: row.totalClientes ?? 0,
    createdAt: row.createdAt.toISOString()
  };
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export async function listCorujaoClientes(req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const q = String(req.query.q || "").trim();

    const searchFilter = q
      ? or(
          ilike(schema.corujaoClientes.name, `%${q}%`),
          ilike(schema.corujaoClientes.phone, `%${q}%`),
          ilike(schema.corujaoClientes.instagram, `%${q}%`)
        )
      : undefined;

    const [[totalRow], clientes] = await Promise.all([
      db.select({ value: count() }).from(schema.corujaoClientes).where(searchFilter),
      db.select().from(schema.corujaoClientes).where(searchFilter)
        .orderBy(desc(schema.corujaoClientes.createdAt))
        .limit(limit)
        .offset(offset)
    ]);

    const total = totalRow?.value ?? 0;

    if (clientes.length === 0) {
      return res.json({
        clientes: [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
      });
    }

    const ids = clientes.map((c) => c.id);

    const statsRows = await db.execute<{
      cliente_id: number;
      visitou: boolean;
      ultima_visita: string | null;
      total_confirmacoes: number;
    }>(sql`
      SELECT
        c.id AS cliente_id,
        BOOL_OR(p.status = 'attended') AS visitou,
        MAX(CASE WHEN p.status = 'attended' THEN s.date END) AS ultima_visita,
        COUNT(CASE WHEN p.status IN ('confirmed', 'attended') THEN 1 END)::int AS total_confirmacoes
      FROM corujao_clientes c
      LEFT JOIN corujao_presencas p ON p.cliente_id = c.id
      LEFT JOIN corujao_sessoes s ON s.id = p.sessao_id
      WHERE c.id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})
      GROUP BY c.id
    `);

    const statsMap = new Map(Array.from(statsRows).map((r) => [
      r.cliente_id,
      { visitouAlgumaVez: r.visitou, ultimaVisita: r.ultima_visita ?? null, totalConfirmacoes: r.total_confirmacoes }
    ]));

    return res.json({
      clientes: clientes.map((c) => serializeCliente({ ...c, ...statsMap.get(c.id) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error("[corujao] listClientes error:", error);
    return res.status(500).json({ message: "Erro ao listar clientes." });
  }
}

export async function createCorujaoCliente(req: Request, res: Response) {
  try {
    const { name, phone, instagram, notes } = req.body as {
      name?: string;
      phone?: string;
      instagram?: string;
      notes?: string;
    };

    if (!name?.trim()) return res.status(400).json({ message: "Nome é obrigatório." });

    const db = getCheckoutDb();
    const [cliente] = await db
      .insert(schema.corujaoClientes)
      .values({
        name: name.trim(),
        phone: phone?.trim() || null,
        instagram: instagram?.trim().replace(/^@/, "") || null,
        notes: notes?.trim() || null
      })
      .returning();

    return res.status(201).json({ cliente: serializeCliente(cliente!) });
  } catch (error) {
    console.error("[corujao] createCliente error:", error);
    return res.status(500).json({ message: "Erro ao criar cliente." });
  }
}

export async function updateCorujaoCliente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const { name, phone, instagram, notes, active } = req.body as {
      name?: string;
      phone?: string | null;
      instagram?: string | null;
      notes?: string | null;
      active?: unknown;
    };

    const updates: Partial<typeof schema.corujaoClientes.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (instagram !== undefined) updates.instagram = instagram?.trim().replace(/^@/, "") || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (active !== undefined) updates.active = Boolean(active);

    const db = getCheckoutDb();
    const [cliente] = await db
      .update(schema.corujaoClientes)
      .set(updates)
      .where(eq(schema.corujaoClientes.id, id))
      .returning();

    if (!cliente) return res.status(404).json({ message: "Cliente não encontrado." });

    return res.json({ cliente: serializeCliente(cliente) });
  } catch (error) {
    console.error("[corujao] updateCliente error:", error);
    return res.status(500).json({ message: "Erro ao atualizar cliente." });
  }
}

export async function deleteCorujaoCliente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.corujaoClientes)
      .where(eq(schema.corujaoClientes.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Cliente não encontrado." });

    return res.json({ message: "Cliente removido." });
  } catch (error) {
    console.error("[corujao] deleteCliente error:", error);
    return res.status(500).json({ message: "Erro ao remover cliente." });
  }
}

// ── Sessões ───────────────────────────────────────────────────────────────────

export async function listCorujaoSessoes(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();
    const sessoes = await db
      .select()
      .from(schema.corujaoSessoes)
      .orderBy(desc(schema.corujaoSessoes.date));

    if (sessoes.length === 0) return res.json({ sessoes: [] });

    const ids = sessoes.map((s) => s.id);

    const statsRows = await db.execute<{
      sessao_id: number;
      confirmados: number;
      presentes: number;
      pendentes: number;
    }>(sql`
      SELECT
        p.sessao_id,
        COUNT(CASE WHEN p.status = 'confirmed' THEN 1 END)::int AS confirmados,
        COUNT(CASE WHEN p.status = 'attended' THEN 1 END)::int AS presentes,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END)::int AS pendentes
      FROM corujao_presencas p
      WHERE p.sessao_id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})
      GROUP BY p.sessao_id
    `);

    const [totalClientesRow] = await db
      .select({ value: count() })
      .from(schema.corujaoClientes)
      .where(eq(schema.corujaoClientes.active, true));

    const totalClientes = totalClientesRow?.value ?? 0;
    const statsMap = new Map(Array.from(statsRows).map((r) => [r.sessao_id, r]));

    return res.json({
      sessoes: sessoes.map((s) => {
        const st = statsMap.get(s.id);
        return serializeSessao({ ...s, confirmados: st?.confirmados ?? 0, presentes: st?.presentes ?? 0, pendentes: st?.pendentes ?? 0, totalClientes });
      })
    });
  } catch (error) {
    console.error("[corujao] listSessoes error:", error);
    return res.status(500).json({ message: "Erro ao listar sessões." });
  }
}

export async function createCorujaoSessao(req: Request, res: Response) {
  try {
    const { date, title, status } = req.body as {
      date?: string;
      title?: string;
      status?: string;
    };

    if (!date?.trim()) return res.status(400).json({ message: "Data é obrigatória." });

    const db = getCheckoutDb();
    const [sessao] = await db
      .insert(schema.corujaoSessoes)
      .values({
        date: date.trim(),
        title: title?.trim() || null,
        status: (status as "planned" | "done" | "cancelled") || "planned"
      })
      .returning();

    return res.status(201).json({ sessao: serializeSessao(sessao!) });
  } catch (error) {
    console.error("[corujao] createSessao error:", error);
    return res.status(500).json({ message: "Erro ao criar sessão." });
  }
}

export async function updateCorujaoSessao(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const { date, title, status } = req.body as {
      date?: string;
      title?: string | null;
      status?: string;
    };

    const updates: Partial<typeof schema.corujaoSessoes.$inferInsert> = { updatedAt: new Date() };
    if (date !== undefined) updates.date = date.trim();
    if (title !== undefined) updates.title = title?.trim() || null;
    if (status !== undefined) updates.status = status as "planned" | "done" | "cancelled";

    const db = getCheckoutDb();
    const [sessao] = await db
      .update(schema.corujaoSessoes)
      .set(updates)
      .where(eq(schema.corujaoSessoes.id, id))
      .returning();

    if (!sessao) return res.status(404).json({ message: "Sessão não encontrada." });

    return res.json({ sessao: serializeSessao(sessao) });
  } catch (error) {
    console.error("[corujao] updateSessao error:", error);
    return res.status(500).json({ message: "Erro ao atualizar sessão." });
  }
}

export async function deleteCorujaoSessao(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const [deleted] = await db
      .delete(schema.corujaoSessoes)
      .where(eq(schema.corujaoSessoes.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Sessão não encontrada." });

    return res.json({ message: "Sessão removida." });
  } catch (error) {
    console.error("[corujao] deleteSessao error:", error);
    return res.status(500).json({ message: "Erro ao remover sessão." });
  }
}

// ── Presenças ─────────────────────────────────────────────────────────────────

export async function getSessaoPresencas(req: Request, res: Response) {
  try {
    const sessaoId = Number(req.params.id);
    if (isNaN(sessaoId)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const rows = await db.execute<{
      id: number;
      name: string;
      phone: string | null;
      instagram: string | null;
      presenca_id: number | null;
      status: string;
    }>(sql`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.instagram,
        p.id AS presenca_id,
        COALESCE(p.status, 'pending') AS status
      FROM corujao_clientes c
      LEFT JOIN corujao_presencas p ON p.cliente_id = c.id AND p.sessao_id = ${sessaoId}
      WHERE c.active = true
      ORDER BY c.name ASC
    `);

    return res.json({
      presencas: Array.from(rows).map((r) => ({
        clienteId: r.id,
        name: r.name,
        phone: r.phone ?? null,
        instagram: r.instagram ?? null,
        presencaId: r.presenca_id ?? null,
        status: r.status
      }))
    });
  } catch (error) {
    console.error("[corujao] getSessaoPresencas error:", error);
    return res.status(500).json({ message: "Erro ao buscar presenças." });
  }
}

export async function upsertPresenca(req: Request, res: Response) {
  try {
    const sessaoId = Number(req.params.sessaoId);
    const clienteId = Number(req.params.clienteId);
    if (isNaN(sessaoId) || isNaN(clienteId)) return res.status(400).json({ message: "IDs inválidos." });

    const { status } = req.body as { status?: string };
    const validStatuses = ["pending", "confirmed", "attended", "absent"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const db = getCheckoutDb();
    const [presenca] = await db
      .insert(schema.corujaoPresencas)
      .values({ clienteId, sessaoId, status: status as "pending" | "confirmed" | "attended" | "absent" })
      .onConflictDoUpdate({
        target: [schema.corujaoPresencas.clienteId, schema.corujaoPresencas.sessaoId],
        set: { status: status as "pending" | "confirmed" | "attended" | "absent", updatedAt: new Date() }
      })
      .returning();

    return res.json({ presenca: { id: presenca!.id, clienteId, sessaoId, status: presenca!.status } });
  } catch (error) {
    console.error("[corujao] upsertPresenca error:", error);
    return res.status(500).json({ message: "Erro ao atualizar presença." });
  }
}

// ── Stats gerais ──────────────────────────────────────────────────────────────

export async function getCorujaoStats(_req: Request, res: Response) {
  try {
    const db = getCheckoutDb();

    const [[totalClientes], [totalAtivos], [totalSessoes], statsRows] = await Promise.all([
      db.select({ value: count() }).from(schema.corujaoClientes),
      db.select({ value: count() }).from(schema.corujaoClientes).where(eq(schema.corujaoClientes.active, true)),
      db.select({ value: count() }).from(schema.corujaoSessoes),
      db.execute<{ ja_vieram: number }>(sql`
        SELECT COUNT(DISTINCT cliente_id)::int AS ja_vieram
        FROM corujao_presencas
        WHERE status = 'attended'
      `)
    ]);

    return res.json({
      totalClientes: totalClientes?.value ?? 0,
      totalAtivos: totalAtivos?.value ?? 0,
      totalSessoes: totalSessoes?.value ?? 0,
      jaVieram: Array.from(statsRows)[0]?.ja_vieram ?? 0
    });
  } catch (error) {
    console.error("[corujao] getStats error:", error);
    return res.status(500).json({ message: "Erro ao buscar stats." });
  }
}

// ── Histórico do cliente ──────────────────────────────────────────────────────

export async function getClienteHistorico(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

    const db = getCheckoutDb();
    const rows = await db.execute<{
      sessao_id: number;
      date: string;
      title: string | null;
      sessao_status: string;
      presenca_status: string;
    }>(sql`
      SELECT
        s.id AS sessao_id,
        s.date,
        s.title,
        s.status AS sessao_status,
        COALESCE(p.status, 'pending') AS presenca_status
      FROM corujao_sessoes s
      LEFT JOIN corujao_presencas p ON p.sessao_id = s.id AND p.cliente_id = ${id}
      ORDER BY s.date DESC
    `);

    return res.json({
      historico: Array.from(rows).map((r) => ({
        sessaoId: r.sessao_id,
        date: r.date,
        title: r.title ?? null,
        sessaoStatus: r.sessao_status,
        presencaStatus: r.presenca_status
      }))
    });
  } catch (error) {
    console.error("[corujao] getClienteHistorico error:", error);
    return res.status(500).json({ message: "Erro ao buscar histórico." });
  }
}

export { and };
