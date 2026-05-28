import { count, and, asc, gte, inArray } from "drizzle-orm";
import { getCheckoutDb, schema } from "../db/index";

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
    client.write(message);
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
