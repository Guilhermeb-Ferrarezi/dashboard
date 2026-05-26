// Lista sessões com contagem de vagas vendidas.
// Uso: bun --env-file=.env run scripts/list-sessoes.mjs
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

try {
  const rows = await sql`
    SELECT
      s.id,
      s.data,
      s.total_vagas,
      s.status,
      s.observacoes,
      COUNT(v.id)::int AS vagas_vendidas
    FROM corujao_sessoes s
    LEFT JOIN corujao_visitas v ON v.sessao_id = s.id
    GROUP BY s.id
    ORDER BY s.data DESC, s.id DESC
    LIMIT 50
  `;

  if (rows.length === 0) {
    console.log("Nenhuma sessão cadastrada ainda.");
    process.exit(0);
  }

  function fmtDate(d) {
    if (typeof d === "string") return d;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  console.log(`=== ${rows.length} sessão(ões) (mais recentes primeiro) ===\n`);
  for (const r of rows) {
    const vagas = `${r.vagas_vendidas}/${r.total_vagas}`;
    console.log(
      `#${String(r.id).padStart(3)}  ${fmtDate(r.data)}  ${r.status.padEnd(10)}  ${vagas.padStart(6)} vagas` +
        (r.observacoes ? `  — ${r.observacoes}` : "")
    );
  }
} finally {
  await sql.end();
}
