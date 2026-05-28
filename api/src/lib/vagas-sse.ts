import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { count, and, asc, gte, inArray } from "drizzle-orm";
import { getCheckoutDb, schema } from "../db/index";
import type { AppEnv } from "../types/hono";

type VagasPayload = {
  sessaoId: number;
  data: string;
  totalVagas: number;
  vagasVendidas: number;
  vagasRestantes: number;
} | null;

type SseWriter = {
  write: (data: string) => void | Promise<void>;
};

const clients = new Set<SseWriter>();

// Handler Hono para SSE de vagas — usado como middleware de rota
export function addClient(c: Context<AppEnv>) {
  return streamSSE(c, async (stream) => {
    const writer: SseWriter = {
      write: (data: string) => stream.write(data),
    };
    clients.add(writer);
    stream.onAbort(() => clients.delete(writer));

    const payload = await getVagasPayload();
    await stream.write(`event: vagas-update\ndata: ${JSON.stringify(payload)}\n\n`);

    // manter stream vivo até o cliente desconectar
    await new Promise<void>((resolve) => stream.onAbort(resolve));
  });
}

export function addSseClient(writer: SseWriter, onClose: (fn: () => void) => void) {
  clients.add(writer);
  onClose(() => clients.delete(writer));

  getVagasPayload().then((data) => {
    writer.write(`event: vagas-update\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

export async function broadcast() {
  if (clients.size === 0) return;
  const data = await getVagasPayload();
  const message = `event: vagas-update\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

export async function getVagasPayload(): Promise<VagasPayload> {
  const db = getCheckoutDb();
  const today = new Date().toISOString().slice(0, 10);

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

  if (sessoes.length === 0) return null;

  const vagasMap = new Map<number, number>();
  const rows = await db
    .select({ sessaoId: schema.corujaoVisitas.sessaoId, total: count() })
    .from(schema.corujaoVisitas)
    .where(inArray(schema.corujaoVisitas.sessaoId, sessoes.map((s) => s.id)))
    .groupBy(schema.corujaoVisitas.sessaoId);

  for (const r of rows) {
    if (r.sessaoId !== null) vagasMap.set(r.sessaoId, r.total);
  }

  const sessao = sessoes.find((s) => {
    const vendidas = vagasMap.get(s.id) ?? 0;
    return vendidas < s.totalVagas;
  });

  if (!sessao) return null;

  const vagasVendidas = vagasMap.get(sessao.id) ?? 0;

  return {
    sessaoId: sessao.id,
    data: sessao.data,
    totalVagas: sessao.totalVagas,
    vagasVendidas,
    vagasRestantes: Math.max(0, sessao.totalVagas - vagasVendidas)
  };
}
