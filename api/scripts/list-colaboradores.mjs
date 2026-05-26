// Lista colaboradores com total de visitas atribuídas.
// Uso: bun --env-file=.env run scripts/list-colaboradores.mjs
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

try {
  const rows = await sql`
    SELECT
      c.id, c.nome, c.ativo, c.mongo_id, c.created_at,
      COUNT(v.id)::int AS visitas
    FROM colaboradores c
    LEFT JOIN corujao_visitas v ON v.colaborador_id = c.id
    GROUP BY c.id
    ORDER BY c.nome ASC
  `;

  if (rows.length === 0) {
    console.log("Nenhum colaborador cadastrado.");
    process.exit(0);
  }

  console.log(`=== ${rows.length} colaborador(es) ===\n`);
  for (const r of rows) {
    const ativo = r.ativo ? "ativo  " : "INATIVO";
    const mongo = r.mongo_id ? r.mongo_id.slice(0, 20) : "(sem mongo_id)";
    console.log(
      `#${String(r.id).padStart(3)}  ${ativo}  ${String(r.visitas).padStart(3)} visitas  ${r.nome.padEnd(24)}  ${mongo}`
    );
  }
} finally {
  await sql.end();
}
