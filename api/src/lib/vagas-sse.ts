import type { Response } from "express";
import { count, and, asc, gte, inArray } from "drizzle-orm";
import { getCheckoutDb, schema } from "../db/index";

type VagasPayload = {
  sessaoId: number;
  data: string;
  totalVagas: number;
  vagasVendidas: number;
  vagasRestantes: number;
} | null;

const clients = new Set<Response>();

export function addClient(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.write("\n");

  clients.add(res);
  res.on("close", () => clients.delete(res));

  getVagasPayload().then((data) => {
    res.write(`event: vagas-update\ndata: ${JSON.stringify(data)}\n\n`);
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

  const [sessao] = await db
    .select()
    .from(schema.corujaoSessoes)
    .where(
      and(
        gte(schema.corujaoSessoes.data, today),
        inArray(schema.corujaoSessoes.status, ["planejado", "aberto", "lotado"])
      )
    )
    .orderBy(asc(schema.corujaoSessoes.data), asc(schema.corujaoSessoes.id))
    .limit(1);

  if (!sessao) return null;

  const [row] = await db
    .select({ total: count() })
    .from(schema.corujaoVisitas)
    .where(
      inArray(schema.corujaoVisitas.sessaoId, [sessao.id])
    );

  const vagasVendidas = row?.total ?? 0;

  return {
    sessaoId: sessao.id,
    data: sessao.data,
    totalVagas: sessao.totalVagas,
    vagasVendidas,
    vagasRestantes: Math.max(0, sessao.totalVagas - vagasVendidas)
  };
}
